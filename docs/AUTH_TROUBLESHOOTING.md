# 認証トラブルシューティング & 設定ガイド

現在発生している「LINEログイン後にトップページに戻ってしまう」問題は、SupabaseやLINE側の**URL設定の不一致**が原因である可能性が高いです。
以下の項目を順番に確認し、設定を行ってください。

## 1. SupabaseのURL設定

Supabaseダッシュボードにログインし、対象プロジェクトを開いてください。

1. 左メニューの **Authentication** > **URL Configuration** をクリック。
2. **Site URL** に、本番環境（Amplify）のURLを入力してください。
   - 例: `https://main.dxxxxxxxx.amplifyapp.com` (末尾の `/` なしで統一することを推奨)
3. **Redirect URLs** に以下のURLをすべて追加してください。
   - `http://localhost:3000` (開発用)
   - `https://main.dxxxxxxxx.amplifyapp.com` (本番用・末尾スラッシュなし)
   - `https://main.dxxxxxxxx.amplifyapp.com/` (本番用・末尾スラッシュあり ※念のため)
4. **Save** を押して保存します。

## 2. LINE Developersの設定

LINE Developersコンソールにログインし、対象のチャネルを開いてください。

1. **LINE Login** タブをクリック。
2. **Callback URL** の設定を確認します。
   - ここには、**アプリが送信している `redirect_uri` と完全に一致するURL** を登録する必要があります。
   - コード上では `window.location.origin` を使用しているため、末尾のスラッシュは**ありません**。
   - 設定すべき値: `https://main.dxxxxxxxx.amplifyapp.com`
   - ローカル用: `http://localhost:3000`
   - **重要:** `http` と `https` の違い、末尾の `/` の有無が異なるとエラーになります。

## 3. AWS Amplifyのリライト設定 (SPA対応)

Reactのようなシングルページアプリケーション(SPA)では、リダイレクト後に404エラーにならないよう、サーバー側の設定が必要です。

1. AWS Amplifyコンソール > 対象アプリ > **Rewrites and redirects** を開く。
2. 以下の設定が入っているか確認してください（なければ追加し、**一番上に移動**させてください）。
   - **Source address**: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
   - **Target address**: `/index.html`
   - **Type**: `200 (Rewrite)`

## 4. 挙動の確認

設定完了後、再度ログインをお試しください。

### それでも直らない場合

「URL設定は合っているのに直らない」場合は、SupabaseのEdge Function (`line-login`) がエラーを返している可能性があります。
その場合、アプリ画面に「ログイン失敗: [エラー内容]」というトースト通知が一瞬表示されていないかご確認ください。
