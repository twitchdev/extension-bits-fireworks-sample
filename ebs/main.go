/**
 *    Copyright 2019 Amazon.com, Inc. or its affiliates
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	jwt "github.com/dgrijalva/jwt-go"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

const (
	authHeaderName      string = "Authorization"
	authHeaderPrefix    string = "Bearer "
	authHeaderPrefixLen int    = len(authHeaderPrefix)
	minLegalTokenLength int    = authHeaderPrefixLen + 5
)

type contextKeyType string

type service struct {
	parser    jwt.Parser
	clientID  string
	ownerID   string
	secret    []byte
	nextPongs map[string]time.Time
	mutex     sync.Mutex
}

type pubSubMessage struct {
	ContentType string   `json:"content_type"`
	Targets     []string `json:"targets"`
	Message     string   `json:"message"`
}

func parseArgs() (clientID string, ownerID string, secret []byte) {
	argClientID := flag.String("clientID", "", "Extension Client ID")
	argOwnerID := flag.String("ownerID", "", "Extension Owner ID")
	argSecret := flag.String("secret", "", "Extension Secret")

	flag.Parse()

	if argClientID == nil || *argClientID == "" {
		flag.Usage()
		os.Exit(1)
	}
	clientID = *argClientID

	if argOwnerID == nil || *argOwnerID == "" {
		flag.Usage()
		os.Exit(1)
	}
	ownerID = *argOwnerID

	if argSecret == nil || *argSecret == "" {
		flag.Usage()
		os.Exit(1)
	}
	secret, err := base64.StdEncoding.DecodeString(*argSecret)
	if err != nil {
		log.Fatalf("Could not parse secret: %v", err)
	}

	return
}

func main() {
	svc := newService(parseArgs())
	r := mux.NewRouter()

	s := r.PathPrefix("/api").Subrouter()
	s.HandleFunc("/fireworks", svc.fireworksHandler).Methods("POST")
	s.Use(svc.verifyAuthJWT)
	s.Use(svc.verifyBitsJWT)

	// Serve frontend assets
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("../client/")))

	log.Println("Starting server on http://localhost:8080/")
	log.Fatal(http.ListenAndServe(":8080", handlers.CORS(handlers.AllowedHeaders([]string{authHeaderName}))(r)))
}

// newService creates an instance of our service data that stores the secret and JWT parser
func newService(clientID string, ownerID string, secret []byte) *service {
	return &service{
		parser:    jwt.Parser{ValidMethods: []string{"HS256"}},
		clientID:  clientID,
		ownerID:   ownerID,
		secret:    secret,
		nextPongs: make(map[string]time.Time),
	}
}

// fireworksHandler verifies the Bits transaction JWT and sends out purchased Bits SKU via PubSub
func (s *service) fireworksHandler(w http.ResponseWriter, r *http.Request) {
	authClaims := getAuthClaims(r)
	bitsClaims := getBitsClaims(r)

	s.send(authClaims.ChannelID, bitsClaims.Data.Product.Sku)
	w.Write([]byte(http.StatusText(http.StatusOK)))
}

func (s *service) getKey(*jwt.Token) (interface{}, error) {
	return s.secret, nil
}

// verifyBitsJWT is middleware that confirms the validity of incoming requests
func (s *service) verifyBitsJWT(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, err := ioutil.ReadAll(r.Body)
		defer r.Body.Close()
		if err != nil {
			log.Println("Missing Channel ID")
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		var body struct {
			TransactionToken string `json:"token"`
		}
		err = json.Unmarshal(b, &body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		parsedToken, err := s.parser.ParseWithClaims(body.TransactionToken, &jwtBitsClaims{}, s.getKey)

		if err != nil {
			log.Println(err)
			http.Error(w, "Could not parse Bits transaction token", http.StatusInternalServerError)
			return
		}

		if claims, ok := parsedToken.Claims.(*jwtBitsClaims); ok && parsedToken.Valid {
			next.ServeHTTP(w, setBitsClaims(r, claims))
		} else {
			log.Println("Could not parse Bits JWT claims")
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
			return
		}
	})
}

// verifyBitsJWT is middleware that confirms the validity of incoming requests
func (s *service) verifyAuthJWT(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var token string

		tokens, ok := r.Header[authHeaderName]
		if !ok {
			log.Println("Missing authorization header")
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
			return
		}

		if len(tokens) != 1 {
			log.Println("Multiple authorization headers found")
			http.Error(w, "Multiple authorization headers found; only one header should be sent", http.StatusUnauthorized)
			return
		}

		token = tokens[0]
		if !strings.HasPrefix(token, authHeaderPrefix) || len(token) < minLegalTokenLength {
			log.Println("Malformed authorization header")
			http.Error(w, "Malformed authorization header", http.StatusUnauthorized)
			return
		}
		token = strings.TrimPrefix(token, authHeaderPrefix)

		parsedToken, err := s.parser.ParseWithClaims(token, &jwtAuthClaims{}, s.getKey)

		if err != nil {
			log.Println(err)
			http.Error(w, "Could not parse authorization header", http.StatusInternalServerError)
			return
		}

		if claims, ok := parsedToken.Claims.(*jwtAuthClaims); ok && parsedToken.Valid {
			next.ServeHTTP(w, setAuthClaims(r, claims))
		} else {
			log.Println("Could not parse auth JWT claims")
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
			return
		}
	})
}

// newJWT creates an EBS-signed JWT
func (s *service) newJWT(channelID string) string {
	var expiration = time.Now().Add(time.Minute * 3).Unix()

	claims := jwtAuthClaims{
		UserID:    s.ownerID,
		ChannelID: channelID,
		Role:      "external",
		Permissions: jwtPermissions{
			Send: []string{"broadcast"},
		},
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expiration,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	tokenString, err := token.SignedString(s.secret)
	if err != nil {
		log.Println(err)
	}

	log.Printf("Generated JWT: %s\n", tokenString)

	return tokenString
}

// check for PubSub cooldown on a channelID
func (s *service) inCooldown(channelID string) bool {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	if next, found := s.nextPongs[channelID]; found && next.After(time.Now()) {
		return true
	}

	s.nextPongs[channelID] = time.Now().Add(time.Second)
	return false
}

// send extension PubSub message
func (s *service) send(channelID, message string) {
	if s.inCooldown(channelID) { // don't spam PubSub or you'll be rate limited
		log.Println("Service is in cooldown")
		return
	}

	m := pubSubMessage{
		"application/json",
		[]string{"broadcast"},
		message,
	}

	b := new(bytes.Buffer)
	json.NewEncoder(b).Encode(m)

	req, err := http.NewRequest("POST", fmt.Sprintf("https://api.twitch.tv/extensions/message/%v", channelID), b)
	if err != nil {
		log.Println(err)
	}

	req.Header.Set("Client-Id", s.clientID)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("%s%v", authHeaderPrefix, s.newJWT(channelID)))

	log.Printf("Sending Bits SKU %s via PubSub for channel %s\n", message, channelID)
	res, err := http.DefaultClient.Do(req)
	if res != nil {
		defer res.Body.Close()
	}

	if err != nil {
		log.Println(err)
	}
}
