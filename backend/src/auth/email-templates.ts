export const getWelcomeEmailHtml = (name: string, verifyLink: string, frontendUrl: string): string => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #131517; margin: 0; padding: 0; color: #FFFFFF; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1C1F22; padding: 40px; border-radius: 8px; margin-top: 40px; margin-bottom: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .logo { height: 40px; }
    .content { font-size: 16px; line-height: 1.6; color: #D1D5DB; }
    .title { color: #FFFFFF; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .button-container { text-align: center; margin: 40px 0; }
    .button { background-color: #06777F; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; }
    .footer { text-align: center; font-size: 12px; color: #6B7280; margin-top: 40px; border-top: 1px solid #2D3136; padding-top: 20px; }
    .highlight { color: #DAF043; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${frontendUrl}/logo-full.png" alt="Aksurim Logo" class="logo" />
    </div>
    <div class="content">
      <div class="title">Olá, ${name}!</div>
      <p>Obrigado por criar sua conta no <span class="highlight">Aksurim Controle</span>. Estamos muito felizes em tê-lo conosco.</p>
      <p>Para garantir a segurança da sua conta e liberar seu acesso completo à plataforma, precisamos que você confirme este endereço de e-mail.</p>
      
      <div class="button-container">
        <a href="${verifyLink}" class="button" style="color: #FFFFFF !important;">Confirmar meu E-mail</a>
      </div>
      
      <p style="font-size: 14px; color: #9CA3AF;">
        Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:<br>
        <a href="${verifyLink}" style="color: #06777F; word-break: break-all;">${verifyLink}</a>
      </p>
    </div>
    <div class="footer">
      Este é um e-mail automático enviado pelo sistema Aksurim.<br>
      © ${new Date().getFullYear()} Aksurim Software. Todos os direitos reservados.
    </div>
  </div>
</body>
</html>
`;

export const getVerificationSuccessHtml = (frontendUrl: string): string => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-mail Verificado | Aksurim Controle</title>
  <style>
    body { font-family: 'Inter', 'Helvetica Neue', sans-serif; background-color: #0B0E14; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; color: #FFFFFF; }
    .card { background-color: #171A21; padding: 50px 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); text-align: center; max-width: 480px; width: 100%; border-top: 4px solid #DAF043; }
    .logo { height: 40px; margin-bottom: 30px; }
    .icon { width: 64px; height: 64px; background-color: rgba(6, 119, 127, 0.15); color: #06777F; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 24px auto; }
    .icon svg { width: 32px; height: 32px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; fill: none; }
    h1 { margin: 0 0 16px 0; font-size: 24px; color: #FFFFFF; font-weight: 600; }
    p { margin: 0 0 32px 0; color: #94A3B8; line-height: 1.6; font-size: 15px; }
    .btn { background-color: #06777F; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block; transition: background-color 0.2s; border: none; cursor: pointer; }
    .btn:hover { background-color: #055e64; }
  </style>
</head>
<body>
  <div class="card">
    <img src="${frontendUrl}/logo-full.png" alt="Aksurim Logo" class="logo" />
    
    <div class="icon">
      <svg viewBox="0 0 24 24">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    </div>
    
    <h1>E-mail Verificado com Sucesso!</h1>
    <p>Parabéns! Sua conta no Aksurim Controle foi totalmente ativada. Você já pode fechar esta tela e acessar seu painel.</p>
    
    <a href="${frontendUrl}" class="btn">Acessar a Plataforma</a>
  </div>
</body>
</html>
`;
