# Code Signing Policy

This page states the public code-signing policy for the SimplyPlayer project.
We sign our release binaries to verify their authenticity and integrity.

Free code signing provided by [SignPath.io](https://signpath.io), certificate
by [SignPath Foundation](https://signpath.org).

_Last updated: November 22, 2026_

## What is signed

- Windows installer and application executables (`.exe`) published on
  [GitHub Releases](https://github.com/DarkDeny/SimplyPlayer/releases).

## Build and signing process

- Official Windows releases are built only from the public repository
  [DarkDeny/SimplyPlayer](https://github.com/DarkDeny/SimplyPlayer) using the
  project's GitHub Actions trusted-build workflow
  (`.github/workflows/release.yml`), triggered exclusively by pushing a
  signed-off version tag.
- Only CI-built artifacts are submitted to SignPath for signing.
- The private key is held by SignPath on their HSM. This project does not
  store or have access to the private key.
- Every signing request requires explicit manual approval by the maintainer
  before the release is published.

## Project roles and responsibilities

Dmitry Denisov (GitHub: [DarkDeny](https://github.com/DarkDeny)) is the sole
maintainer, committer, reviewer and signing approver. Changes to release
workflows, signing configuration or packaging code require maintainer review
and approval before a release is packaged.

## Signing scope

Code signing is strictly limited to official SimplyPlayer open-source
releases. No third-party or commercial artifacts are signed under this
policy.

## Privacy policy

SimplyPlayer does not collect, transmit or sell any user data. It plays local
audio files and checks the update feed on launch; no analytics, telemetry or
tracking is included.
