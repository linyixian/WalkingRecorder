# Walking GUIDE01

GUIDE01実機接続用のVite/TypeScript版です。

BLE接続は参考コードに合わせて、`@guide01/protocol` の `Guide01Protocol` とGIF Text表示プロトコルを使います。

## 同梱したもの

- `vendor/guide01-protocol`: `guide01-main-typescript.zip` に含まれていた `@guide01/protocol`
- `src/libguide01_protocol.wasm`: GUIDE01プロトコルWASM

## 起動

```bash
npm install
npm run dev
```

Bluefy / Android Chrome から、PCのLAN IPのHTTPS URLで開いてください。Web Bluetooth、GPS、加速度センサーはHTTPSが必要です。

## GitHub Pagesへ公開

このプロジェクトはGitHub ActionsでPagesへデプロイできます。

1. GitHubでpublic repositoryを作成します。リポジトリ名: `WalkingRecorder`
2. このフォルダをそのリポジトリへpushします。
3. GitHubのリポジトリ画面で `Settings` > `Pages` を開きます。
4. `Build and deployment` の `Source` を `GitHub Actions` にします。
5. `main` ブランチへpushすると `.github/workflows/deploy-pages.yml` が実行されます。
6. 公開URLは `https://<username>.github.io/WalkingRecorder/` になります。

Viteの `base` は `./` にしているため、プロジェクトサイトのURLでもそのまま動きます。

## GUIDE01表示内容

1秒ごとにGIF Textへ以下を表示します。

- 現在時間
- 経過時間
- 距離
- ペース
- 歩数
- コメント
