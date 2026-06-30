const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Ler o arquivo .p8
const p8File = fs.readdirSync(__dirname).find(f => f.endsWith('.p8') && f.startsWith('AuthKey_'));
if (!p8File) {
  console.error("ERRO: Nenhum arquivo .p8 encontrado na raiz do projeto!");
  process.exit(1);
}

// Pegar o Key ID automaticamente do nome do arquivo
const keyId = p8File.split('_')[1].split('.')[0];
console.log(`Key ID detectado: ${keyId}`);

// Pegar o Team ID e Client ID dos argumentos do script
const teamId = process.argv[2];
const clientId = process.argv[3] || 'com.waitravel.app.service';

if (!teamId) {
  console.error("ERRO: Você precisa informar o Team ID. Exemplo: node generate-apple-secret.js SEU_TEAM_ID");
  process.exit(1);
}

console.log(`Team ID: ${teamId}`);
console.log(`Client/Service ID: ${clientId}`);
console.log("Gerando Secret Key JWT...");

try {
  const privateKey = fs.readFileSync(path.join(__dirname, p8File), 'utf8');

  // Payload conforme a Apple exige para gerar a Client Secret
  const payload = {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60), // 180 dias (limite máximo de 6 meses)
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  const secret = jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    keyid: keyId,
  });

  console.log("\n=======================================================");
  console.log("✅ SECRET KEY GERADA COM SUCESSO! Copie o código abaixo:");
  console.log("=======================================================\n");
  console.log(secret);
  console.log("\n=======================================================");
  console.log("⚠️ Lembre-se: Este código expira em exatos 6 meses!");
} catch (error) {
  console.error("Erro ao gerar JWT:", error.message);
}
