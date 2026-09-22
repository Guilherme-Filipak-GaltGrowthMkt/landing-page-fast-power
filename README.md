# Landing Page — Fast Power (V4)

Preview de aprovação da landing page da Fast Power (gestão de TI e cabeamento
estruturado para empresas B2B). Site estático, sem build.

**Preview:** https://guilherme-filipak-galtgrowthmkt.github.io/landing-page-fast-power/

## Estrutura

```
index.html          página única, 8 dobras
assets/css/         estilos e tokens
assets/js/          animação do hero e interações
assets/fonts/       Archivo variable (wght + wdth)
assets/img/         fotos stand-in, a substituir pelas da Fast Power
```

## Pendências antes do go-live

- Fotos reais da Fast Power (manter os mesmos nomes de arquivo em `assets/img/`)
- Logos dos clientes citados
- Número de empresas atendidas (hoje placeholder na 2ª dobra)
- Confirmação da headline (estamos com a Opção 01 da copy)
- Remover `robots.txt` ao publicar no servidor definitivo

## Rodar local

```
python3 -m http.server 8837
```
