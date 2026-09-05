# life-log-next-js-app

Next.jsを使った個人向けライフログアプリケーションです。
出来事を本文・日時・タグ付きで記録し、新しい順に振り返れます。

## 技術スタック

- **Next.js 16.3.3** - React フレームワーク（App Routerを使用）
- **React 19.2.8** - ユーザーインターフェース構築
- **TypeScript** - 型安全性
- **Tailwind CSS 4** - スタイリング
- **SQLite** - データベース（better-sqlite3）
- **ESLint** - コード品質管理

## 機能

- 出来事の登録・一覧・編集・論理削除（ゴミ箱）
- 記録一覧をJSONファイルとしてエクスポート
- エクスポートしたJSONファイルのインポート（ID重複・不正レコードはスキップ）
- 記録への現在地付与と位置情報付き記録の地図表示
- 本文1,000文字、日時、タグの入力検証
- SQLiteのライフログ・タグ・関連テーブル
- レスポンシブデザイン対応
- ダークモード対応（手動切替機能付き）
    - ライトモードとダークモードの2つのモードを手動で切り替え可能
    - ユーザーの選択はローカルストレージに保存され、ページ再読み込み時も維持されます
- TypeScriptによる型安全性
- モダンなUI/UXデザイン

## 始め方

### 前提条件

- Node.js 26.x以上
- npm、yarn、またはpnpm

### インストール

1. リポジトリをクローン：
    ```bash
    git clone https://github.com/TakuyaFukumura/life-log-next-js-app.git
    ```
    ```bash
    cd life-log-next-js-app
    ```

2. 依存関係をインストール：
    ```bash
    npm install
    ```
   または
    ```bash
    yarn install
    ```
   または
    ```bash
    pnpm install
    ```

### 開発サーバーの起動

```bash
npm run dev
```

または

```bash
yarn dev
```

または

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて
アプリケーションを確認してください。

### ビルドと本番デプロイ

本番用にアプリケーションをビルドする：

```bash
npm run build
```

```bash
npm start
```

または

```bash
yarn build
```

```bash
yarn start
```

または

```bash
pnpm build
```

```bash
pnpm start
```

## プロジェクト構造

```
├── lib/
│   └── database.ts          # SQLiteデータベース接続・操作
├── src/
│   └── app/
│       ├── api/
│       │   ├── lifelogs/    # 出来事の一覧・登録・更新・削除API
│       │   └── trash/       # ゴミ箱・復元・完全削除API
│       ├── components/      # Reactコンポーネント
│       │   ├── DarkModeProvider.tsx  # ダークモードProvider
│       │   └── Header.tsx   # ヘッダーコンポーネント
│       ├── globals.css      # グローバルスタイル
│       ├── layout.tsx       # アプリケーションレイアウト
│       ├── map/
│       │   └── page.tsx     # 地図表示画面（互換用）
│       ├── logs/
│       │   └── page.tsx     # 記録一覧画面
│       └── page.tsx         # 初期画面（地図）
├── data/                    # SQLiteデータベースファイル（自動生成）
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## API エンドポイント

### GET /api/lifelogs

通常の出来事を新しい順に取得します。`page` でページを指定できます。

**レスポンス:**

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

### GET /api/lifelogs/export

削除されていない全記録を、`LifeLog` の削除日時を除いたトップレベル配列のJSONとしてダウンロードします。記録一覧画面の「JSONをダウンロード」ボタンからも利用できます。

`POST /api/lifelogs` で登録、`PATCH` と `DELETE`（論理削除）を `/api/lifelogs/:id` に対して実行できます。

### POST /api/lifelogs/import

`GET /api/lifelogs/export` で出力したトップレベル配列のJSONを受け取り、記録をインポートします。既存または同一ファイル内でIDが重複する記録は登録せず、形式不正の記録はスキップします。

**レスポンス:**

```json
{
  "imported": 1,
  "skipped": 2,
  "invalid": 0
}
```
削除済みの記録は `/api/trash` から確認・復元・完全削除できます。

`GET /api/lifelogs/map` では、位置情報付きの記録を最大100件取得できます。
`tagId`、`from`、`to` で絞り込みでき、100件を超えた場合は `truncated: true` が返ります。

SQLiteデータベースは初回起動時に自動的に作成されます：

- データベースファイル: `data/app.db`
- `lifelogs`: 出来事本体
- `tags`: タグ
- `lifelog_tags`: 出来事とタグの関連

タグの初期値はリポジトリ内の `config/tags.csv` から読み込まれます。CSVに追加したタグは、次回起動時に既存のタグを残したまま登録されます。

## カスタマイズ

### メッセージの変更

データベース内のメッセージを変更したい場合は、
SQLiteクライアントを使用して `data/app.db` ファイル内の `messages` テーブルを編集してください。

### スタイルの変更

スタイルは Tailwind CSS を使用しています。
`src/app/page.tsx` ファイル内のクラス名を変更することで、外観をカスタマイズできます。

## 開発

### テスト

このプロジェクトはJestを使用したテストが設定されています。

#### テストの実行

```bash
npm test
```

または

```bash
yarn test
```

または

```bash
pnpm test
```

#### テストの監視モード

```bash
npm run test:watch
```

#### カバレッジレポートの生成

```bash
npm run test:coverage
```

#### テストファイルの構成

- `__tests__/lib/database.test.ts`: データベース機能のテスト
- `__tests__/src/app/components/DarkModeProvider.test.tsx`: ダークモードProvider のテスト
- `__tests__/src/app/components/Header.test.tsx`: ヘッダーコンポーネントのテスト

#### テストの特徴

- **データベーステスト**: SQLiteを使用した実際のデータベース操作のテスト
- **Reactコンポーネントテスト**: React Testing Library を使用したコンポーネントのレンダリングとインタラクションのテスト
- **モッキング**: localStorage や外部依存関係のモック
- **カバレッジ**: コードカバレッジの測定と報告

### リンティング

```bash
npm run lint
```

または

```bash
yarn lint
```

または

```bash
pnpm lint
```

### 型チェック

TypeScriptの型チェックは、ビルド時またはIDEで自動的に実行されます。

## CI/CD

このプロジェクトはGitHub Actionsを使用した継続的インテグレーション（CI）を設定しています。

### 自動テスト

以下の条件でCIが実行されます：

- `main`ブランチへのプッシュ時
- プルリクエストの作成・更新時

CIでは以下のチェックが行われます：

- ESLintによる静的解析
- TypeScriptの型チェック
- Jestを使用したユニットテストとインテグレーションテスト
- アプリケーションのビルド検証
- Node.js 26.x での動作確認

## 自動依存関係更新（Dependabot）

このプロジェクトでは、依存関係の安全性と最新化のために[Dependabot](https://docs.github.com/ja/code-security/dependabot)
を利用しています。

- GitHub Actionsおよびnpmパッケージの依存関係は**月次（月曜日 09:00 JST）**で自動チェック・更新されます。
- 更新内容は自動でプルリクエストとして作成されます。
- 詳細な設定は `.github/dependabot.yml` を参照してください。

## トラブルシューティング

### データベース関連のエラー

- `data/` フォルダが存在しない場合、自動的に作成されます
- データベースファイルが破損した場合は、`data/app.db` を削除して再起動してください

### ポート競合

デフォルトのポート3000が使用中の場合：

```bash
npm run dev -- --port 3001
```
