<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DQX Battle Master Core - Live Edition

DQXの戦闘画面をキャプチャして、AI行動カウンター・敵HP・CT・バフ/デバフ・ボムタイマーなどをオーバーレイ表示するデスクトップアプリです。

## 機能概要

- 画面キャプチャ（ウィンドウ選択）
- クリックスルー対応のゲームオーバーレイ
- 敵HP％ / フェーズ / AIカウントの表示
- 敵CT（推定） / 次回行動予測
- バフ/デバフ表示
- ボム自動爆発タイマー（サファイア系）
- デモモード
- 自動更新（GitHub Releases）

## 前提条件

- Windows 10/11
- Node.js（LTS推奨）
- npm

## ローカル起動（開発）

1. 依存関係のインストール
   - npm install
2. 開発サーバー起動
   - npm run dev

## デスクトップアプリ起動（開発）

- npm run dev:desktop

## ビルド（配布）

- npm run build:desktop

成果物は release フォルダーに出力されます（Git管理対象外）。

## GitHub Releasesでの配布（自動更新）

このプロジェクトは GitHub Releases を自動更新の配布先に設定済みです。

### 配布手順

1. GitHub Personal Access Token を発行
   - 権限: repo
2. 環境変数 GH_TOKEN を設定
3. ビルド実行
   - npm run build:desktop

ビルド完了後、GitHub Releases に最新のインストーラーと latest.yml が自動アップロードされます。
利用者側はネット接続があれば自動更新が動作します（トークンは不要）。

## 重要注意

- GH_TOKEN は絶対に公開しないでください。
- release/ 配下は Git に入れないでください（.gitignore で除外済み）。

## 既知の制約

- OCR は現在スタブ実装です。ログ認識によるタイマー精度はOCR導入後に向上します。
- 画面に表示されない内部データ（敵CTの正確値等）は推定です。

## コマンド一覧

- npm run dev
- npm run dev:desktop
- npm run build
- npm run build:desktop
- npm run pack:desktop

## ライセンス

MIT
