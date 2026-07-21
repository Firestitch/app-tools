# Serve
`npm run serve [args]`

|  Arg | Value  |  Default |
| ------------ | ------------ | ------------ |
|  --env |  string  | local |
|  --port |  number | package.json ￫ config ￫ port |
|  --secure |  boolean | false |
|  --live-reload |  boolean |  false |


# Build
`npm run build [args]`

|  Arg | Value  | Default |
| ------------ | ------------ | ------------ |
|  --env |  string  | dev |


# Package
`npm run package [args]`

|  Arg | Value  | Default |
| ------------ | ------------ | ------------ |
|  --env |  string  | production |


# SSL
`npx ssl [command]`

|  Command | Description |
| ------------ | ------------ |
|  info |  Show the certificate hosts, expiry and whether the CA is trusted (default) |
|  trust |  Install the development root CA into this machine's trust store |
|  untrust |  Remove it again |
|  reissue |  Reissue only the certificate, e.g. after editing its hostnames. No re-trust needed |
|  generate |  Reissue the CA *and* the certificate. Forces every developer to rerun `trust` |

`serve --secure` uses `ssl/localhost.crt`, issued by the **Firestitch Development Root CA**
and valid for `localhost`, `local.firestitch.com`, `*.local.firestitch.com`, `127.0.0.1`
and `::1`.

Browsers only trust a certificate whose issuer is in the machine's trust store, so each
developer runs **`npx ssl trust` once per machine** to get a padlock instead of the
"Your connection is not private" interstitial. Windows will show a one-time security
confirmation; accept it. Restart the browser afterwards.

Chrome, Edge and Firefox all pick the CA up from the Windows store — Firefox enables
`security.enterprise_roots.enabled` by default there. On macOS and Linux, Firefox uses its
own store instead, so import `ssl/ca.crt` under Settings ￫ Privacy & Security ￫ Certificates.

Firefox validates certificates far more strictly than Chrome, and because this certificate
is name constrained it parses *every* subject alternative name rather than only the one it
is matching. One entry Firefox dislikes therefore rejects the whole certificate with
`SEC_ERROR_BAD_DER` on every host. Keep the hostname list conservative, and after changing
it run `npx ssl reissue` and check the result in Firefox, not just Chrome.

The CA private key ships publicly in this repo, which is only acceptable because the CA
carries a critical **name constraints** extension limiting it to the hosts above. A machine
that trusts this root still rejects a certificate it issued for any other domain, so the
key cannot be used to intercept real traffic. Never reuse it outside development.

The certificate expires in 2036 and the CA in 2046. To reissue, run `npx ssl generate` —
changing the CA means every developer must rerun `npx ssl trust`, so prefer adding hostnames
under `*.local.firestitch.com` (covered by the existing certificate) instead.
