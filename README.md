# Digital Credential Request Constructor

This demo application serves as an interactive tool to construct and test requests for the **Digital Credentials API**. It allows developers to select different protocols, data formats, and requested fields to generate a code sample that can be used to request verifiable presentations from a user's digital wallet.

## Key Features

*   **Request Construction**: Dynamically build `navigator.credentials.get()` requests.
*   **Protocol Selection**: Switch between `OpenID4VP` and `org-iso-mdoc` protocols.
*   **Data Format**: Choose between `mso_mdoc`, `dc` (using SD-JWT), or both.
*   **Security Options**: Configure response encryption for OpenID4VP.
*   **Live Code Generation**: See the JavaScript code update in real-time as you change options.
*   **In-Browser Testing**: Run the generated request directly in a compatible browser to interact with a wallet provider.

## Further Reading

To learn more about the underlying technologies, please refer to the following resources:

- **Digital Credentials API Documentation**: [digitalcredentials.dev/docs/intro](https://digitalcredentials.dev/docs/intro/)
- **W3C Digital Credentials Specification**: [w3.org/TR/digital-credentials](https://www.w3.org/TR/digital-credentials/)
- **OpenID for Verifiable Presentations Spec**: [openid.net/specs/openid-4-verifiable-presentations-1_0-final.html](https://openid.net/specs/openid-4-verifiable-presentations-1_0-final.html)
