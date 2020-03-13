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
	"context"
	"net/http"

	jwt "github.com/dgrijalva/jwt-go"
)

const jwtAuthClaimsKey contextKeyType = "jwtAuthClaims"
const jwtBitsClaimsKey contextKeyType = "jwtBitsClaims"

type jwtAuthClaims struct {
	OpaqueUserID string         `json:"opaque_user_id,omitempty"`
	UserID       string         `json:"user_id"`
	ChannelID    string         `json:"channel_id,omitempty"`
	Role         string         `json:"role"`
	Permissions  jwtPermissions `json:"pubsub_perms"`
	jwt.StandardClaims
}

type jwtPermissions struct {
	Send   []string `json:"send,omitempty"`
	Listen []string `json:"listen,omitempty"`
}

type jwtBitsClaims struct {
	Topic string `json:"topic"`
	Data  data   `json:"data"`
	jwt.StandardClaims
}

type data struct {
	Product       product `json:"product"`
	Time          string  `json:"time"`
	TransactionID string  `json:"transactionId"`
	UserID        string  `json:"userId"`
}

type product struct {
	DomainID      string `json:"domainId"`
	Sku           string `json:"sku"`
	DisplayName   string `json:"displayName"`
	Cost          cost   `json:"Cost"`
	InDevelopment bool   `json:"inDevelopment"`
}

type cost struct {
	Amount int64  `json:"amount"`
	Type   string `json:"type"`
}

func setAuthClaims(r *http.Request, claims *jwtAuthClaims) *http.Request {
	ctx := context.WithValue(r.Context(), jwtAuthClaimsKey, claims)
	return r.WithContext(ctx)
}

func getAuthClaims(r *http.Request) *jwtAuthClaims {
	if claims, ok := r.Context().Value(jwtAuthClaimsKey).(*jwtAuthClaims); ok {
		return claims
	}
	return &jwtAuthClaims{} // empty default
}

func setBitsClaims(r *http.Request, claims *jwtBitsClaims) *http.Request {
	ctx := context.WithValue(r.Context(), jwtBitsClaimsKey, claims)
	return r.WithContext(ctx)
}

func getBitsClaims(r *http.Request) *jwtBitsClaims {
	if claims, ok := r.Context().Value(jwtBitsClaimsKey).(*jwtBitsClaims); ok {
		return claims
	}
	return &jwtBitsClaims{} // empty default
}
