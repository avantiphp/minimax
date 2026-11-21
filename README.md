# Imbituva — PWA pronta para publicar

Pacote gerado pelo **PWA Maker** a partir do mockup de tela offline.

| Item | Valor |
|---|---|
| URL base | https://app.imbituva.com |
| Escopo (scope) | `/` |
| Início (start_url) | `/` |
| Tema | `#013A7C` |
| Fundo | `#EFF2F7` |
| Cache do service worker | `pwamaker-v1-ab6e1c` |
| Package ID (Android) | `com.imbituva.app` |
| Flavor do APK | TWA (Bubblewrap) · APK assinado |

## Conteúdo

```
index.html                       página inicial (app shell) + registro do SW
offline.html                     tela de fallback offline (mockup)
manifest.webmanifest             manifesto do app
sw.js                            service worker (cache offline)
icons/                           ícones 72→512, maskable, monochrome, favicons
brand/logo.svg                   logo vetorial de origem
.github/workflows/build-apk.yml  GitHub Actions: PWA → APK
assetlinks.json.example          Digital Asset Links (template)
report.json                      relatório de geração e validação
```

## 1. Publicar a PWA em app.imbituva.com

Envie o conteúdo desta pasta (o arquivo `index.html` na raiz) para o servidor
que atende `https://app.imbituva.com`. O `sw.js` **precisa** ficar na raiz do
escopo, ao lado do `index.html`.

### Headers HTTP (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name app.imbituva.com;
    root /var/www/app.imbituva.com;
    index index.html;

    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location ~* \.(webmanifest|png|ico|svg)$ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }
}
```

### Checklist

- [ ] `https://app.imbituva.com/manifest.webmanifest` responde 200
- [ ] `https://app.imbituva.com/sw.js` responde 200 com `Content-Type: application/javascript`
- [ ] Service worker registrado no escopo `/` (DevTools → Application → Service Workers)
- [ ] Teste offline: DevTools → Network → Offline → recarregar → aparece `offline.html`
- [ ] Lighthouse / PWA Builder sem erros de installability
- [ ] `https://app.imbituva.com/.well-known/assetlinks.json` publicado (para o APK)

### Precache do service worker

- `index.html`
- `offline.html`
- `manifest.webmanifest`
- `icons/icon-192.png`
- `icons/icon-maskable-512.png`

## 2. Converter a PWA em APK

O workflow `.github/workflows/build-apk.yml` já está pronto.

1. Publique a PWA (passo 1) — o empacotador lê o manifesto pela URL pública.
2. Envie esta pasta para um repositório GitHub.
3. Crie os secrets (Settings → Secrets and variables → Actions):

| Secret | Valor |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | keystore em base64 (`base64 -w0 release.keystore`) |
| `ANDROID_KEYSTORE_PASSWORD` | senha do keystore |
| `ANDROID_KEY_ALIAS` | alias da chave |
| `ANDROID_KEY_PASSWORD` | senha da chave |

4. Dispare o build:
   - **manual:** aba *Actions* → *Build APK* → *Run workflow*;
   - **automático:** `git tag v1.0.0 && git push --tags`.
5. Baixe o artefato `app-<tag>` em *Actions* → *Artifacts* (contém o `.apk` e o
   `assetlinks.json` já com o fingerprint real do certificado).

> No modo `debug` (padrão) a keystore é gerada temporariamente no CI: o APK
> instala e roda, mas **não** pode ser publicado na Play Store. Para release,
> troque `SIGNING: 'debug'` por `'release'` no topo do workflow e cadastre os secrets.

### Digital Asset Links

Sem o `assetlinks.json` publicado, o TWA abre com a barra de endereço do
navegador. Publique o arquivo gerado pelo workflow em:

```
https://app.imbituva.com/.well-known/assetlinks.json
```

O `package_name` precisa ser `com.imbituva.app` e o fingerprint o
SHA-256 do certificado de assinatura.

## 3. Regenerar o pacote

```
php tools/build-imbituva.php
```

O script redesenha o logo, regenera os ícones, o manifesto, o `sw.js`, o
workflow de APK e o ZIP em `imbituva/`.
