// src/lib/emailTemplate.ts

export function getConfirmationEmailHtml(name: string, date: string, confirmLink: string) {
  // A dátum formázása szebbre (pl: 2026. május 7. 15:00)
  const formattedDate = new Date(date).toLocaleString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
    <!DOCTYPE html>
    <html lang="hu">
    <head>
      <meta charset="UTF-8">
      <style>
        .body { background-color: #fdf2f8; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 40px; padding: 40px; text-align: center; border: 1px solid #fce7f3; box-shadow: 0 10px 30px rgba(219, 39, 119, 0.05); }
        .logo { font-family: 'Georgia', serif; font-size: 32px; font-weight: bold; color: #1e293b; margin-bottom: 30px; letter-spacing: -1px; }
        .logo span { color: #db2777; }
        .title { color: #1e293b; font-size: 26px; font-weight: bold; margin-bottom: 15px; }
        .text { color: #64748b; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
        .slot-box { background-color: #fff1f2; border: 1px dashed #fda4af; border-radius: 24px; padding: 25px; margin: 30px 0; }
        .slot-label { color: #9f1239; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; display: block; }
        .slot-time { color: #1e293b; font-size: 22px; font-weight: bold; margin: 0; }
        .button { display: inline-block; background-color: #db2777; color: #ffffff !important; padding: 18px 40px; text-decoration: none; border-radius: 22px; font-weight: bold; font-size: 16px; margin: 20px 0; box-shadow: 0 10px 20px rgba(219, 39, 119, 0.2); }
        .notice { color: #94a3b8; font-size: 12px; margin-top: 40px; line-height: 1.5; max-width: 400px; margin-left: auto; margin-right: auto; }
        .footer { margin-top: 50px; padding-top: 30px; border-top: 1px solid #f1f5f9; color: #64748b; font-size: 13px; }
        .footer b { color: #475569; }
      </style>
    </head>
    <body class="body">
      <div class="container">
        <div class="logo">Nails<span>by</span>Nelly</div>
        
        <h1 class="title">Szia ${name}! 🎀</h1>
        
        <p class="text">
          Köszönöm az érdeklődésedet! Már csak egyetlen gombnyomás választ el attól, hogy véglegesítsük az időpontodat.
        </p>

        <div class="slot-box">
          <span class="slot-label">Kért időpont:</span>
          <p class="slot-time">${formattedDate}</p>
        </div>

        <a href="${confirmLink}" class="button">IDŐPONT MEGERŐSÍTÉSE</a>

        <p class="notice">
          Ha nem te kezdeményezted ezt a foglalást, kérlek hagyd figyelmen kívül ezt a levelet. Az időpont megerősítés nélkül 1 órán belül törlődik.
        </p>

        <div class="footer">
          <p><b>Helyszín:</b> 6721 Szeged, Hullám utca 3.<br>
          <b>Mobil:</b> +36 30 433 0624</p>
          <p style="font-size: 11px; color: #cbd5e1; margin-top: 20px;">© 2026 Nails by Nelly. Minden jog fenntartva.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}