# bits-fireworks
An extension that demonstrates how to leverage [Bits](https://dev.twitch.tv/docs/extensions/monetization/) as a monetization mechanism.  

![](fireworks.gif)


## What's in the sample
The video-overlay extension allows viewers to spend Bits and trigger a fireworks animation on stream in return. When the broadcaster configures the extension, they select which of the two fireworks types they want to enable: Small (10 Bits) or Large (100 Bits).

The extension uses the [Configuration Service](https://dev.twitch.tv/docs/extensions/building/#configuration-service) to store and retrieve the fireworks type and an EBS to verifiy the validity of Bits transactions.  

## Requirements
- Go 1.10+ with [`dep`](https://github.com/golang/dep) for dependency management. 
- OpenSSL. If on Windows, you can install Git which bundles it.  

## Installation 
1. Create a new `Video - Fullscreen` extension. Select `Bits enabled` in the Monetization tab and `Extension Configuration Service` in the Capabilities tab. Set its Testing Base URI to `http://localhost:8080/` as we're not using HTTPS for example purposes. Record its `Client ID` and `Extension Secret`. 
2. Load the extension in the [Developer Rig](https://github.com/twitchdev/developer-rig) to setup its [Bits Products Catalog](https://dev.twitch.tv/docs/extensions/monetization/#bits-product-catalog): 

| Product Name     | SKU                 | Amount (in Bits) | In Development | Broadcast |
| ---------------- | ------------------- | ---------------- | -------------- | --------- |
| Small Fireworks  | small_fireworks_10  | 10               | Yes            | Yes       |
| Large Fireworks  | large_fireworks_100 | 100              | Yes            | Yes       |

3. Clone the repo under your `$GOPATH/src` directory and navigate to the `ebs` directory; usually this would be `$GOPATH/src/github.com/twitchdev/extensions-samples/bits-fireworks/ebs`.
4. Install the dependencies: `dep ensure`.

## Usage

1. Run the extension EBS:
`go build && ./ebs -clientID <CLIENT_ID> -ownerID <OWNER_ID> -secret <SECRET>`

The `OWNER_ID` is the user ID of the person who created the extension from Step 1 (you). To get the user ID, you will need to execute a simple cURL command against the Twitch API `/users` endpoint by passing your Twitch username:
`curl -H "Client-ID: <client id>" -X GET "https://api.twitch.tv/helix/users?login=<username>"`

To simplify development, the EBS also serves the front-end assets. You should see the "Launch Fireworks!" button if you open http://localhost:8080/video_overlay.html in your browser. 

2. Install and configure the extension on your channel. You can do so via the https://dev.twitch.tv/console/extensions/CLIENT_ID/0.0.1/status page (see the `View on Twitch and Install` button). Note that you must explicitly allow HTTP content to be loaded when viewing the extension on twitch.tv. For example, in Chrome, this is done by clicking on the shield icon in the right corner of the location bar.
