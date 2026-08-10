// Vercel Edge Middleware — jednostavna HTTP Basic Auth zaštita frontenda.
//
// Zašto ovo umjesto Vercel "Password Protection": ta opcija zahtijeva Pro
// plan + Advanced Deployment Protection ($150/mj) — Direktor je odlučio da
// to NE plaćamo. Edge Middleware je besplatan na svim Vercel planovima
// (uključujući Hobby) i daje istu suštinsku zaštitu: provjera se dešava na
// serveru PRIJE nego što se ijedan fajl (HTML/JS/CSS) pošalje browseru —
// nije zaobilazno gledanjem izvornog koda (za razliku od JS ekrana za
// lozinku u samoj aplikaciji).
//
// Lozinka se NE nalazi u kodu/git-u — postavlja se kao Vercel environment
// varijabla SITE_PASSWORD (Project Settings → Environment Variables).
// Browser prikazuje svoj ugrađeni prozorčić "Username and Password"
// (username polje se ignoriše, provjerava se samo lozinka).
//
// DECISION_LOG.md DL-002 — zamjena za plaćenu Vercel Password Protection.

export const config = {
  matcher: "/:path*",
};

export default function middleware(request) {
  const password = process.env.SITE_PASSWORD;

  // Fail-closed: ako env varijabla nije podešena, NE puštaj nikoga (umjesto
  // da slučajno ostane bez zaštite ako neko zaboravi postaviti env var).
  if (!password) {
    return new Response(
      "Server nije podešen: nedostaje SITE_PASSWORD environment varijabla u Vercel Project Settings.",
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth && auth.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(auth.slice(6));
    } catch {
      decoded = "";
    }
    const idx = decoded.indexOf(":");
    const pwd = idx === -1 ? decoded : decoded.slice(idx + 1);
    if (pwd === password) {
      return; // tačna lozinka — pusti zahtjev dalje ka aplikaciji
    }
  }

  return new Response("Autentifikacija je potrebna.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="IDSS Raspored", charset="UTF-8"',
    },
  });
}
