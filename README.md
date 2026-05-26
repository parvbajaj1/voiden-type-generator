# Voiden Type Generator

A community plugin for [Voiden](https://voiden.dev) that instantly generates typed model code from your API responses.

## Features

- Automatically captures JSON from every HTTP response
- Tracks responses **per open `.void` file** — switching files loads that file's last response
- Supports **TypeScript, Dart, Go, Kotlin, Swift, and Java**
- Edit the JSON manually or let it auto-fill from your requests
- Live regeneration with copy-to-clipboard
- Persists your language, class name, and options across sessions

## Installation

1. Download `voiden-type-generator.zip` from the [latest release](https://github.com/parvbajaj1/voiden-type-generator/releases)
2. In Voiden → **Settings → Plugins → Install from zip**
3. Select the downloaded zip and reload

## Usage

1. Run any HTTP request that returns JSON in Voiden
2. Open the **Types** tab in the right sidebar (`{ }` icon)
3. Pick a target language and class name
4. Copy the generated code with the copy button

You can also click **Edit JSON** to paste or edit JSON manually.

## Supported Languages & Options

| Language   | Options                                  |
|------------|------------------------------------------|
| TypeScript | Readonly fields, Types only (no runtime) |
| Dart       | Null safety, `copyWith` method           |
| Go         | *(always emits JSON tags)*               |
| Kotlin     | `@Serializable` (kotlinx)               |
| Swift      | Structs vs classes                       |
| Java       | Getters / setters                        |

## Development

```bash
npm install
npm run build     # outputs dist/main.js
npm run package   # build + zip → dist/voiden-type-generator.zip
npm test          # run tests
```

See [PLUGIN.md](PLUGIN.md) for architecture details, SDK notes, and how per-file tracking works.

## Contributing

Pull requests are welcome. For larger changes, open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
