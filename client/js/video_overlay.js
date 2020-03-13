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

var twitch = window.Twitch ? window.Twitch.ext : null;
var useBits = null;

(function () {
  var authToken = "";
  var sku = "";

  if (!twitch) {
    return;
  }

  window.onload = function () {
    document.getElementById('fireworksBtn').addEventListener('click', function () {
      if (sku == "") {
        log("no sku received from the configuration svc");
        return
      }
      twitch.bits.useBits(sku);
    });
  }

  twitch.onAuthorized(function (auth) {
    authToken = auth.token;
    log("onAuthorized() fired, running on channel: " + auth.channelId);
  });

  twitch.configuration.onChanged(function () {
    sku = twitch.configuration.broadcaster ? twitch.configuration.broadcaster.content : "";
    log("onChanged() fired, previously broadcaster-selected sku: " + sku)
  });

  twitch.bits.onTransactionComplete(function (transaction) {
    log("onTransactionComplete() fired, received transactionReceipt: " + transaction.transactionReceipt);
    fetch("http://localhost:8080/api/fireworks", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + authToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: transaction.transactionReceipt })
    }).then(function (response) {
      if (response.ok) {
        log("ebs validated transaction")
      }
      else {
        log("ebs was unable to validate transaction")
      }
    });
  });

  twitch.listen('broadcast', function (topic, contentType, sku) {
    log("listen() fired, received sku via PubSub: " + sku + ". Shooting Fireworks!");
    launchFireworks(sku);
  });
})()
