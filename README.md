# Digital Credential Request Constructor

This demo application serves as an interactive tool to construct and test requests for the **Digital Credentials API**. It allows developers to select different protocols, data formats, and requested fields to generate a code sample that can be used to request verifiable presentations from a user's digital wallet.

## Key Features

*   **Request Construction**: Dynamically build `navigator.credentials.get()` requests.
*   **Protocol Selection**: Switch between `OpenID4VP` and `org-iso-mdoc` protocols, or add a request with an arbitrary protocol to try [protocol filtering](#protocol-filtering).
*   **Data Format**: Choose between `mso_mdoc`, `dc` (using SD-JWT), or both.
*   **Security Options**: Configure response encryption for OpenID4VP.
*   **Live Code Generation**: See the JavaScript code update in real-time as you change options.
*   **In-Browser Testing**: Run the generated request directly in a compatible browser to interact with a wallet provider.

## Protocol filtering

Chrome plans to ignore Digital Credentials API requests with protocol identifiers that it doesn't recognize. To try this behavior, select one of the following in the **Protocol** list:

*   In the presentation constructor, **OpenID4VP + arbitrary protocol**.
*   In the issuance constructor, **OpenID4VCI + arbitrary protocol**.

The generated call then also includes a request with `arbitrary`, a protocol identifier that the [specification](https://w3c-fedid.github.io/digital-credentials/#protocols) doesn't define. The `arbitrary` request comes last, so the other requests stay the same.

*   If you enable `chrome://flags/#enable-experimental-web-platform-features` and restart Chrome, Chrome ignores the `arbitrary` request and passes only the other requests to the platform.
*   Without the flag, Chrome passes all the requests to the platform, and wallets that don't support the protocol skip the `arbitrary` request.

Either way, the wallet responds to the OpenID4VP or OpenID4VCI request. For more information, see the [ChromeStatus entry](https://chromestatus.com/feature/6492906882990080).

## Issuance backend

The issuance constructor sends the wallet an OpenID4VCI credential offer. The wallet then calls the issuer endpoints in `src/app/openid4vci/` directly. These endpoints are Next.js route handlers, so they only run when the app runs on a server, such as with `npm run dev` or on [Firebase App Hosting](https://firebase.google.com/docs/app-hosting). There, the issuance page uses its own origin as the issuer URL.

The wallet shows the card design that you select in the issuance constructor. The credential endpoint embeds the image from `public/card-designs/` as a `data:` URI in the `display` parameter of the credential response. To add a design, see `src/lib/card-designs.ts`.

The issuance request uses the `openid4vci-v1` protocol identifier from the [Digital Credentials API specification](https://www.w3.org/TR/digital-credentials/). By default, it also repeats the offer in a second request with the earlier `openid4vci` identifier, which Chrome also accepts. [CMWallet](https://github.com/digitalcredentialsdev/CMWallet) needs both: it doesn't appear in the wallet selector for an `openid4vci` request, and it replies with `openid4vci` even to an `openid4vci-v1` request. With only the `openid4vci-v1` request, the reply's protocol doesn't match any requested protocol, and `navigator.credentials.create()` rejects with a `NetworkError` even though the wallet saved the credential. To send only the `openid4vci-v1` request, clear **Add an `openid4vci` request for CMWallet**.

The GitHub Pages build is a static export, so it can't serve the issuer endpoints. To issue credentials from GitHub Pages:

1.  Deploy this app to a host that runs Next.js route handlers.
1.  Set the `ISSUER_URL` [repository variable](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables) to the URL of that deployment, such as `https://issuer.example.com`.
1.  Rerun the **Deploy to GitHub Pages** workflow.

The device that runs the wallet must be able to reach the issuer URL. On your phone, `localhost` refers to the phone, so to test `npm run dev` with a wallet on your phone, do one of the following:

*   Set the issuer URL to your computer's LAN IP address, such as `http://192.168.1.5:9002`. `npm run dev` prints this address as **Network**. The phone must be on the same network.
*   Connect the phone with USB and run `adb reverse tcp:9002 tcp:9002`. The phone can then reach `http://localhost:9002`.

## Further Reading

To learn more about the underlying technologies, please refer to the following resources:

- **Digital Credentials API Documentation**: [digitalcredentials.dev/docs/intro](https://digitalcredentials.dev/docs/intro/)
- **W3C Digital Credentials Specification**: [w3.org/TR/digital-credentials](https://www.w3.org/TR/digital-credentials/)
- **OpenID for Verifiable Presentations Spec**: [openid.net/specs/openid-4-verifiable-presentations-1_0-final.html](https://openid.net/specs/openid-4-verifiable-presentations-1_0-final.html)
