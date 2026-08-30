# -*- coding: utf-8 -*-
"""
SPRINT 12 — Supabase klijent, ISKLJUČIVO server-side.

Tanka omotnica oko Supabase REST API-ja (PostgREST) preko HTTP-a — nema
dodatne `supabase-py` SDK zavisnosti, samo `requests` (već lagana,
uobičajena biblioteka).

SIGURNOST: SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY dolaze ISKLJUČIVO iz
Railway environment varijabli. Ovaj modul se učitava SAMO u main.py
(backend) — service_role ključ NIKAD ne prolazi kroz frontend/browser.
service_role zaobilazi Row Level Security, pa je ekvivalent punog pristupa
bazi — isti standard opreza kao BACKEND_PASSWORD (Sprint 03/09 greška
otkrivena i popravljena za lozinku se ovdje NE smije ponoviti za Supabase).

Tabela (Direktor je kreira sam u Supabase SQL editoru, vidi
sprints/SPRINT_12.md HANDOFF za tačan SQL):
    saved_schedules(id bigint, created_at timestamptz, config jsonb,
                     lessons jsonb, label text, gap_score integer)

Namjerno BEZ automatskog brisanja starih zapisa (P-3 duh primijenjen i
ovdje — jednostavnije, manje rizika da nešto slučajno nestane). Lista
(list_schedules) uvijek vraća samo posljednjih N, stariji ostaju u bazi.
"""
import os
import requests

_TABLE = "saved_schedules"
_TIMEOUT_S = 15


class StorageNotConfigured(Exception):
    """SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY nisu podešeni na serveru —
    OČEKIVANA, jasna greška (main.py je pretvara u čist HTTP 503 odgovor
    frontendu), NE pad aplikacije. Ovo je NAMJERNO ponašanje kad Supabase
    nije podešen — sve ostalo u aplikaciji mora raditi dalje normalno."""
    pass


class StorageError(Exception):
    """Supabase JESTE podešen, ali je poziv propao (mreža, loš odgovor,
    neispravna tabela, itd.) — takođe se pretvara u jasnu grešku, ne pad."""
    pass


def _creds():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise StorageNotConfigured(
            "Čuvanje rasporeda nije podešeno na serveru (nedostaju "
            "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment varijable "
            "na Railway-u)."
        )
    return url.rstrip("/"), key


def _headers(key, prefer=None):
    h = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def save_schedule(config, lessons, label, gap_score):
    """Upisuje jedan zapis. Vraća upisani red (uključujući dodijeljeni id)."""
    url, key = _creds()
    payload = {"config": config, "lessons": lessons, "label": label, "gap_score": gap_score}
    try:
        r = requests.post(
            f"{url}/rest/v1/{_TABLE}",
            json=payload,
            headers=_headers(key, prefer="return=representation"),
            timeout=_TIMEOUT_S,
        )
    except requests.RequestException as e:
        raise StorageError(f"Ne mogu se povezati sa Supabase-om: {e}")
    if r.status_code >= 300:
        raise StorageError(f"Supabase je odbio upis (HTTP {r.status_code}): {r.text[:300]}")
    data = r.json()
    row = data[0] if isinstance(data, list) and data else data
    if not row or "id" not in row:
        raise StorageError("Supabase je vratio neočekivan odgovor pri upisu (bez id-a).")
    return row


def list_schedules(limit=10):
    """Vraća listu {id, created_at, label, gap_score} — najnoviji prvo,
    ograničeno na `limit` (zadano 10, vidi main.py poziv)."""
    url, key = _creds()
    params = {
        "select": "id,created_at,label,gap_score",
        "order": "created_at.desc",
        "limit": str(limit),
    }
    try:
        r = requests.get(f"{url}/rest/v1/{_TABLE}", params=params, headers=_headers(key), timeout=_TIMEOUT_S)
    except requests.RequestException as e:
        raise StorageError(f"Ne mogu se povezati sa Supabase-om: {e}")
    if r.status_code >= 300:
        raise StorageError(f"Supabase je odbio čitanje liste (HTTP {r.status_code}): {r.text[:300]}")
    return r.json()


def get_schedule(schedule_id):
    """Vraća pun zapis (config+lessons+label+gap_score) za jedan id, ili
    None ako ne postoji."""
    url, key = _creds()
    params = {"select": "*", "id": f"eq.{schedule_id}"}
    try:
        r = requests.get(f"{url}/rest/v1/{_TABLE}", params=params, headers=_headers(key), timeout=_TIMEOUT_S)
    except requests.RequestException as e:
        raise StorageError(f"Ne mogu se povezati sa Supabase-om: {e}")
    if r.status_code >= 300:
        raise StorageError(f"Supabase je odbio čitanje (HTTP {r.status_code}): {r.text[:300]}")
    rows = r.json()
    return rows[0] if rows else None
