# Code Signing Policy

This page states the public code-signing policy for the SimplyPlayer project.
We sign our release binaries to verify their authenticity and integrity.

Releases are signed with an Open Source Code Signing certificate issued by
[Certum](https://www.certum.eu) to the project maintainer, Dmitry Denisov.

_Last updated: November 22, 2026_

## What is signed

- Windows installer and application executables (`.exe`) published on
  [GitHub Releases](https://github.com/DarkDeny/SimplyPlayer/releases).

## Build and signing process

- Official Windows releases are built only from the public repository
  [DarkDeny/SimplyPlayer](https://github.com/DarkDeny/SimplyPlayer) using the
  project's GitHub Actions release workflow
  (`.github/workflows/release.yml`), triggered exclusively by pushing a
  version tag.
- Only CI-built artifacts are signed and published.
- The private key is stored in Certum's SimplySign cloud service on
  certified hardware (FIPS 140-2 Level 3 / CC EAL 4+). This project does not
  store the private key in the repository or on developer machines.
- Signing credentials are provided to CI exclusively through GitHub
  encrypted secrets, accessible only to the release workflow.

## Project roles and responsibilities

Dmitry Denisov (GitHub: [DarkDeny](https://github.com/DarkDeny)) is the sole
maintainer, committer, reviewer and certificate holder. Changes to release
workflows, signing configuration or packaging code require maintainer review
and approval before a release is packaged.

## Signing scope

Code signing is strictly limited to official SimplyPlayer open-source
releases distributed free of charge, in accordance with the terms of the
Certum Open Source Code Signing certificate. No third-party or commercial
artifacts are signed under this policy.

## Privacy policy

SimplyPlayer does not collect, transmit or sell any user data. It plays local
audio files and checks the update feed on launch; no analytics, telemetry or
tracking is included.
