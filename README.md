# Tsunagi for VS Code

Companion extension for the [Tsunagi](https://github.com/diegoalegil/tsunagi)
anime data SDK for Java. It helps you start using Tsunagi in a Maven project
without leaving the editor.

## Features

- **Tsunagi: Insert Maven Dependency** — finds your `pom.xml` (asking which one if
  there are several), checks Tsunagi isn't already there, and inserts the
  `<dependency>` into `<dependencies>` (creating the block if needed).
- **Tsunagi: Search Anime** — search AniList straight from the command palette and
  open the cover image; a quick way to check a title while coding.
- **Snippets** — type `tsunagi-client`, `tsunagi-config` or `tsunagi-imports` in a
  Java file to scaffold the usual setup.

## Settings

| Setting | Description |
|---------|-------------|
| `tsunagi.version` | Version inserted into `pom.xml` (default `1.0.0`). |
| `tsunagi.tmdbToken` | Optional TMDb token used in generated snippets/examples. |

## Requirements

- VS Code 1.85+
- A Maven project (a `pom.xml`) for the dependency command.

## Building from source

```bash
npm install
npm run compile        # type-check and emit ./out
npx @vscode/vsce package   # produce a .vsix
```

## Publishing to the Marketplace

Needs a [Visual Studio Marketplace publisher](https://marketplace.visualstudio.com/manage)
named `diegoalegil` and a Personal Access Token:

```bash
npx @vscode/vsce login diegoalegil
npx @vscode/vsce publish
```

## License

[MIT](LICENSE) © Diego Gil
