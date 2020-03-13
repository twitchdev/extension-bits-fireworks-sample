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

(function () {
    var sku = "";

    if (!twitch) {
        return;
    }

    window.onload = function () {
        document.getElementById('saveBtn').addEventListener('click', function () {
            var radioBtns = document.getElementsByName('firework');

            for (var i = 0, length = radioBtns.length; i < length; i++) {
                if (radioBtns[i].checked) {
                    twitch.configuration.set("broadcaster", "", radioBtns[i].id);
                    log("saveSettings() fired, broadcaster-selected sku set to: " + radioBtns[i].id);
                    break;
                }
            }
        });
    }  

    twitch.configuration.onChanged(function () {
        sku = twitch.configuration.broadcaster ? twitch.configuration.broadcaster.content : ""
        log("onChanged() fired, previously broadcaster-selected sku: " + sku)
    })

    twitch.bits.getProducts().then(function (products) {
        products.sort(compare);

        var elementsToRender = [];
        for (var i = 0; i < products.length; i++) {
            var radioBtn = '<label><input type="radio" class="nes-radio is-dark" name="firework" id="' + products[i].sku + '" /><span>' + products[i].displayName + '</span></label>';
            elementsToRender.push(radioBtn);
        }
        $("#configuration").after(elementsToRender);

        if (sku != "") {
            var radioBtn = document.getElementById(sku);
            radioBtn.checked = true;
        }
    });
})()