# SignPath Foundation — черновик заявки

Форма подачи: https://signpath.org/apply.html ("Apply for Free Code Signing").
Ниже — готовые ответы на типовые поля заявки. Перед отправкой сверить с
актуальной формой: состав полей мог измениться.

## Project name

SimplyPlayer

## Project description (EN)

SimplyPlayer is a free, open-source desktop audio player for Windows focused
on audiobook listening: M4B chapter navigation, position persistence,
bookmarks, sleep timer, a 10-band equalizer and playlists. It is built with
Electron, React and TypeScript and distributed under the MIT license.
Releases are built by GitHub Actions from the public repository and published
on GitHub Releases; installed instances update themselves via
Squirrel.Windows from the release feed.

## Website / home page

https://github.com/DarkDeny/SimplyPlayer

## Source code repository

https://github.com/DarkDeny/SimplyPlayer (public)

## Download page

https://github.com/DarkDeny/SimplyPlayer/releases

## License

MIT (OSI-approved), see LICENSE in the repository root.
No commercial dual-licensing; the project contains no proprietary code.

## Code signing policy

https://github.com/DarkDeny/SimplyPlayer/blob/main/CODE_SIGNING_POLICY.md

## Team / maintainers

- Dmitry Denisov (GitHub: DarkDeny) — sole maintainer, committer, reviewer,
  signing approver. MFA enabled on GitHub account.

## Build system / CI

GitHub Actions, workflow `.github/workflows/release.yml` on `windows-latest`.
Releases are triggered only by version tags pushed by the maintainer.

## What will be signed

Windows installer (`SimplyPlayer-*.Setup.exe`) and application executables
produced by electron-forge (Squirrel.Windows), published on GitHub Releases.

## Project status

Actively developed; first public release v0.1.1 published 2026-11-21.

## Чек-лист перед отправкой

- [ ] README, LICENSE, CODE_SIGNING_POLICY.md опубликованы в main
- [ ] MFA включён на GitHub-аккаунте DarkDeny
- [ ] Проверить актуальный список требований на https://signpath.org/apply.html
- [ ] После одобрения: получить API token, добавить секреты в репозиторий,
      встроить шаг подписания в release.yml (submitting to SignPath,
      manual approval), перевыпустить релиз
