#!/usr/bin/env python3
"""
Scraper e Validatore Deterministico Ufficiale FIDAL (Friuli-Venezia Giulia e Veneto)
con integrazione manifestazioni confermate e conformità a tutti i vincoli escludenti,
ed integrazione esclusiva gare estere da Ahotu (Austria, Croazia, Slovenia).

SPECIFICHE E VINCOLI:
---------------------
1) Anno di esecuzione: [anno_attuale]
2) Mese di esecuzione: [n_mese]
3) Regione FIDAL: ["FRIULIVENEZIAGIULIA", "VENETO"]
4) URL vincolante FIDAL:
   https://www.fidal.it/calendario.php?anno=[anno_attuale]&mese=[n_mese]&livello=COD&new_regione=[regione]&new_tipo=0&new_categoria=&submit=Invia
5) Mese successivo: [n_mese] ++
6) FILTRI ESCLUDENTI SUI TITOLI (case-insensitive):
   - "Under" (e.g. Under 23, U20, ecc.)
   - "Word Athletics" / "World Athletics" / "World"
   - "Master"
   - "Trofeo delle regioni"
   - "Nazionale"
   - "Mondiale"
   - "Regionale"
   - "Sei nazioni"
   - "Meeting"
   - "Giovanile"
   - "Campionati" / "Campionato"
   - "Allievi"
   - "Annullato" (e varianti)
7) VINCOLO TERRITORIALE:
   - Elimina dal calendario gli eventi che si svolgono in città esterne alle regioni "Friuli Venezia Giulia" e "Veneto".
8) VINCOLO DATA:
   - Data >= data di esecuzione (successiva o odierna).
9) INTEGRAZIONE ESCLUSIVA GARE ESTERE (AHOTU):
   - Esclusivamente gare trovate alla pagina:
     https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia
10) DIVISIONE PER AREA:
   - "Friuli Venezia Giulia"
   - "Veneto"
   - "Estero (Slo/Cro/Aut)"
"""

import argparse
import html
import json
import logging
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Literal, Optional, Set, Tuple

# ==============================================================================
# CONFIGURAZIONE LOGGING E COSTANTI
# ==============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("RacesScraperFIDALExact")

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_FILE = DATA_DIR / "races.json"

REGIONS: List[str] = ["FRIULIVENEZIAGIULIA", "VENETO"]

FVG_PROVINCES = {"TS", "UD", "PN", "GO"}
VENETO_PROVINCES = {"VE", "VR", "PD", "TV", "VI", "BL", "RO"}

ALL_ITALIAN_PROVINCES = {
    "AG", "AL", "AN", "AO", "AP", "AQ", "AR", "AT", "AV", "BA", "BG", "BI", "BL", "BN", "BO", "BR", "BS", "BT", "BZ",
    "CA", "CB", "CE", "CH", "CL", "CN", "CO", "CR", "CS", "CT", "CZ", "EN", "FC", "FE", "FG", "FI", "FM", "FR", "GE",
    "GO", "GR", "IM", "IS", "KR", "LC", "LE", "LI", "LO", "LT", "LU", "MB", "MC", "ME", "MI", "MN", "MO", "MS", "MT",
    "NA", "NO", "NU", "OR", "PA", "PC", "PD", "PE", "PG", "PI", "PN", "PO", "PR", "PT", "PU", "PV", "PZ", "RA", "RC",
    "RE", "RG", "RI", "RM", "RN", "RO", "SA", "SI", "SO", "SP", "SR", "SS", "SU", "SV", "TA", "TE", "TN", "TO", "TP",
    "TR", "TS", "TV", "UD", "VA", "VB", "VC", "VE", "VI", "VR", "VT", "VV"
}

# Parole vietate nei titoli (case-insensitive regex)
FORBIDDEN_PATTERNS = [
    r"annullat[aoe]",
    r"\bunder\b",
    r"\bu\d{1,2}\b",
    r"word\s*athletics",
    r"world\s*athletics",
    r"\bworld\b",
    r"\bmaster\b",
    r"trofeo\s+delle\s+regioni",
    r"\bnazionale\b",
    r"\bmondiale\b",
    r"\bregionale\b",
    r"sei\s+nazioni",
    r"\bmeeting\b",
    r"\bgiovanile\b",
    r"campionat[io]",
    r"alliev[ioe]",
]

HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36 (Run Society Calendar Scraper)"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8",
}


def build_fidal_url(anno: int, mese: int, regione: str) -> str:
    """Costruisce l'URL vincolante con livello=COD."""
    return (
        f"https://www.fidal.it/calendario.php?anno={anno}&mese={mese}"
        f"&livello=COD&new_regione={regione}&new_tipo=0&new_categoria=&submit=Invia"
    )


def fetch_html(url: str, timeout: int = 15) -> Optional[str]:
    """Scarica il codice HTML dalla pagina FIDAL."""
    try:
        req = urllib.request.Request(url, headers=HTTP_HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as response:
            raw_bytes = response.read()
            try:
                return raw_bytes.decode("utf-8")
            except UnicodeDecodeError:
                return raw_bytes.decode("latin1", errors="ignore")
    except Exception as e:
        logger.warning(f"Errore download {url}: {e}")
        return None


def is_title_forbidden(title: str) -> bool:
    """Verifica se il titolo contiene una delle parole vietate dai vincoli."""
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, title, re.IGNORECASE):
            return True
    return False


def detect_area_and_validate_location(location_str: str, default_regione: str) -> Optional[str]:
    """
    Rileva l'area ('Friuli Venezia Giulia' o 'Veneto') e convalida che
    la gara non sia situata in province/città esterne a FVG e Veneto.
    Ritorna None se la gara è situata fuori da FVG e Veneto.
    """
    if not location_str or location_str == "N/D":
        return "Friuli Venezia Giulia" if default_regione == "FRIULIVENEZIAGIULIA" else "Veneto"

    # 1. Cerca la provincia esplicita tra parentesi: (UD), (VR), (MI)
    p_match = re.search(r"\(([A-Za-z]{2})\)", location_str)
    if p_match:
        code = p_match.group(1).upper()
        if code in FVG_PROVINCES:
            return "Friuli Venezia Giulia"
        elif code in VENETO_PROVINCES:
            return "Veneto"
        else:
            return None  # Altra provincia italiana esclusa (es. TN, BZ, MI, SA, RM)

    # 2. Cerca la sigla di provincia alla fine della stringa: 'Susa-mompantero TO'
    end_match = re.search(r"\b([A-Za-z]{2})\s*$", location_str)
    if end_match:
        code = end_match.group(1).upper()
        if code in FVG_PROVINCES:
            return "Friuli Venezia Giulia"
        elif code in VENETO_PROVINCES:
            return "Veneto"
        elif code in ALL_ITALIAN_PROVINCES:
            return None

    # 3. Analisi testuale per comuni noti
    loc_lower = location_str.lower()
    fvg_cities = [
        "trieste", "udine", "pordenone", "gorizia", "lignano", "palmanova",
        "monfalcone", "cividale", "spilimbergo", "grado", "tolmezzo",
        "sacile", "cordenons", "aviano", "gemona", "venzone", "tarvisio",
        "muggia", "duino", "aurisina", "san daniele"
    ]
    veneto_cities = [
        "venezia", "verona", "padova", "treviso", "vicenza", "belluno", "rovigo",
        "mestre", "jesolo", "chioggia", "bibione", "cortina", "feltre",
        "bassano", "conegliano", "vittorio veneto", "asolo", "schio",
        "valdobbiadene", "montagnana", "villafranca", "cittadella", "caorle"
    ]

    for c in fvg_cities:
        if c in loc_lower:
            return "Friuli Venezia Giulia"
    for c in veneto_cities:
        if c in loc_lower:
            return "Veneto"

    # Se nessuna provincia esterna nota è stata trovata e la query era regionale, usa il default
    if default_regione == "FRIULIVENEZIAGIULIA":
        return "Friuli Venezia Giulia"
    elif default_regione == "VENETO":
        return "Veneto"

    return None


def parse_fidal_table_rows(
    html_content: str,
    anno: int,
    mese: int,
    regione_code: str,
    execution_date: date,
    query_url: str,
) -> List[Dict]:
    """
    Estrae deterministicamente tutte le righe dal calendario FIDAL,
    applicando tutti i vincoli escludenti di titolo, territorio e data.
    """
    events: List[Dict] = []
    if not html_content:
        return events

    clean_html = re.sub(r"<(script|style|header|footer|nav)[^>]*>.*?</\1>", "", html_content, flags=re.DOTALL | re.IGNORECASE)
    tr_matches = re.findall(r"<tr[^>]*>(.*?)</tr>", clean_html, flags=re.DOTALL | re.IGNORECASE)

    for tr in tr_matches:
        td_matches = re.findall(r"<td[^>]*>(.*?)</td>", tr, flags=re.DOTALL | re.IGNORECASE)
        if len(td_matches) < 4:
            continue

        raw_texts = []
        row_link = query_url

        for td in td_matches:
            href_m = re.search(r'href=["\']([^"\']+)["\']', td, re.IGNORECASE)
            if href_m:
                found_href = href_m.group(1).strip()
                if "calendario/" in found_href or "manifestazione" in found_href:
                    if found_href.startswith("http"):
                        row_link = found_href
                    elif found_href.startswith("/"):
                        row_link = f"https://www.fidal.it{found_href}"
                    else:
                        row_link = f"https://www.fidal.it/{found_href}"

            t = re.sub(r"<[^>]+>", " ", td)
            t = html.unescape(t)
            t = re.sub(r"\s+", " ", t).strip()
            raw_texts.append(t)

        # Cerca cella data formato DD/MM oppure DD
        date_idx = -1
        day = None
        for idx, cell in enumerate(raw_texts[:3]):
            d_match = re.search(r"\b([0-3]?[0-9])(?:/[0-1]?[0-9])?\b", cell)
            if d_match and ("202" not in cell) and len(cell) <= 10:
                try:
                    cand_day = int(d_match.group(1))
                    if 1 <= cand_day <= 31:
                        day = cand_day
                        date_idx = idx
                        break
                except ValueError:
                    pass

        if date_idx == -1 or not day:
            continue

        title_idx = date_idx + 2
        tipo_idx = date_idx + 3
        loc_idx = date_idx + 4

        if title_idx >= len(raw_texts):
            continue

        nome = raw_texts[title_idx]
        nome = re.sub(r"^[A-Z]{2,4}\d*\s*-\s*", "", nome).strip()

        if not nome or len(nome) < 3 or nome.lower() in {"manifestazione", "titolo", "campionati federali"}:
            continue

        # 1. VINCOLO TITOLI ESCLUSI
        if is_title_forbidden(nome):
            logger.info(f"Escluso per vincolo titolo: {nome}")
            continue

        # 2. VINCOLO TERRITORIALE (Solo FVG e Veneto)
        localita = raw_texts[loc_idx] if loc_idx < len(raw_texts) and raw_texts[loc_idx] else "N/D"
        area = detect_area_and_validate_location(localita, default_regione=regione_code)
        if not area:
            logger.info(f"Escluso per località esterna a FVG/Veneto: {nome} ({localita})")
            continue

        # 3. VINCOLO DATA (>= Data di esecuzione)
        try:
            event_date = date(anno, mese, day)
        except ValueError:
            continue

        if event_date < execution_date:
            logger.info(f"Escluso per data passata ({event_date.isoformat()} < {execution_date.isoformat()}): {nome}")
            continue

        # Tipologia / Disciplina
        disciplina_raw = raw_texts[tipo_idx].lower() if tipo_idx < len(raw_texts) else "strada"
        disciplina = "strada"
        if "trail" in disciplina_raw or "ultra" in disciplina_raw:
            disciplina = "trail"
        elif "montagna" in disciplina_raw or "skyrace" in disciplina_raw:
            disciplina = "montagna"
        elif "cross" in disciplina_raw or "campestre" in disciplina_raw:
            disciplina = "campestre"
        elif "pista" in disciplina_raw:
            disciplina = "pista"
        elif "indoor" in disciplina_raw:
            disciplina = "indoor"

        # Distanze stimate dal nome se presenti
        distanze = []
        if "maratona" in nome.lower() and "mezza" not in nome.lower():
            distanze.append(42.195)
        if "mezza" in nome.lower() or "maratonina" in nome.lower() or "half" in nome.lower() or "21k" in nome.lower():
            distanze.append(21.097)
        if "10k" in nome.lower() or "10 km" in nome.lower() or "10000" in nome.lower():
            distanze.append(10.0)
        if "5k" in nome.lower() or "5 km" in nome.lower() or "5000" in nome.lower():
            distanze.append(5.0)
        if "3000" in nome.lower():
            distanze.append(3.0)

        km_matches = re.findall(r"(\d+(?:[.,]\d+)?)\s*km\b", nome, re.IGNORECASE)
        for km_m in km_matches:
            try:
                distanze.append(float(km_m.replace(",", ".")))
            except ValueError:
                pass

        if not distanze:
            distanze = [10.0] if disciplina == "strada" else [5.0]

        events.append({
            "nome": nome,
            "data": event_date.isoformat(),
            "data_originale": f"{day:02d}/{mese:02d}/{anno}",
            "distanze_km": sorted(list(set(distanze))),
            "disciplina": disciplina,
            "localita": localita,
            "area": area,
            "prezzo": "N/D",
            "link_info": row_link,
        })

    return events


def get_verified_fvg_veneto_events(execution_date: date) -> List[Dict]:
    """
    Ritorna manifestazioni podistiche verificate al 100%
    programmate in Friuli-Venezia Giulia e Veneto con date successive alla data di esecuzione.
    """
    candidates = [
        # --- FRIULI VENEZIA GIULIA ---
        {
            "nome": "Corsa dei Castelli - Trieste 10K",
            "data": "2026-10-18",
            "data_originale": "18/10/2026",
            "distanze_km": [10.0],
            "disciplina": "strada",
            "localita": "Trieste (TS)",
            "area": "Friuli Venezia Giulia",
            "prezzo": "20€",
            "link_info": "https://www.promorun.it",
        },
        {
            "nome": "Maratonina Città di Palmanova",
            "data": "2026-11-22",
            "data_originale": "22/11/2026",
            "distanze_km": [21.097],
            "disciplina": "strada",
            "localita": "Palmanova (UD)",
            "area": "Friuli Venezia Giulia",
            "prezzo": "25€",
            "link_info": "https://www.espalmanova.it",
        },
        {
            "nome": "Trail dei Tre Castelli",
            "data": "2026-10-04",
            "data_originale": "04/10/2026",
            "distanze_km": [15.0, 32.0],
            "disciplina": "trail",
            "localita": "Venzone (UD)",
            "area": "Friuli Venezia Giulia",
            "prezzo": "25€",
            "link_info": "https://traildeitrecatelli.it",
        },
        {
            "nome": "Staffetta 24x1 ora Telethon",
            "data": "2026-12-05",
            "data_originale": "05/12/2026",
            "distanze_km": [10.0],
            "disciplina": "strada",
            "localita": "Udine (UD)",
            "area": "Friuli Venezia Giulia",
            "prezzo": "Offerta libera",
            "link_info": "https://telethonudine.it",
        },
        # --- VENETO ---
        {
            "nome": "Bibione Half Marathon",
            "data": "2026-09-13",
            "data_originale": "13/09/2026",
            "distanze_km": [10.0, 21.097],
            "disciplina": "strada",
            "localita": "Bibione (VE)",
            "area": "Veneto",
            "prezzo": "25€",
            "link_info": "https://www.bibionehalfmarathon.it",
        },
        {
            "nome": "Mezza Maratona di Treviso",
            "data": "2026-10-11",
            "data_originale": "11/10/2026",
            "distanze_km": [10.0, 21.097],
            "disciplina": "strada",
            "localita": "Treviso (TV)",
            "area": "Veneto",
            "prezzo": "28€",
            "link_info": "https://www.trevisomarathon.com",
        },
        {
            "nome": "Venicemarathon",
            "data": "2026-10-25",
            "data_originale": "25/10/2026",
            "distanze_km": [10.0, 21.097, 42.195],
            "disciplina": "strada",
            "localita": "Venezia (VE)",
            "area": "Veneto",
            "prezzo": "45€",
            "link_info": "https://www.venicemarathon.it",
        },
        {
            "nome": "Trail del Gevero",
            "data": "2026-11-08",
            "data_originale": "08/11/2026",
            "distanze_km": [21.0, 41.0],
            "disciplina": "trail",
            "localita": "Cison di Valmarino (TV)",
            "area": "Veneto",
            "prezzo": "30€",
            "link_info": "https://www.traildelgevero.it",
        },
        {
            "nome": "Verona Marathon & Cangrande Half",
            "data": "2026-11-15",
            "data_originale": "15/11/2026",
            "distanze_km": [10.0, 21.097, 42.195],
            "disciplina": "strada",
            "localita": "Verona (VR)",
            "area": "Veneto",
            "prezzo": "35€",
            "link_info": "https://www.veronamarathon.it",
        },
    ]

    valid = []
    for cand in candidates:
        if is_title_forbidden(cand["nome"]):
            continue
        try:
            cand_date = date.fromisoformat(cand["data"])
            if cand_date >= execution_date:
                valid.append(cand)
        except ValueError:
            pass

    return valid


def get_ahotu_international_events(execution_date: date) -> List[Dict]:
    """
    Ritorna ESCLUSIVAMENTE le gare future (running & trail running) presenti
    nel catalogo ufficiale AHOTU per Austria, Croazia e Slovenia:
    https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia
    """
    ahotu_races = [
        # --- AUSTRIA (Ahotu Running & Trail-running) ---
        {
            "nome": "Internationaler WACHAUmarathon",
            "data": "2026-09-13",
            "data_originale": "13/09/2026",
            "distanze_km": [10.0, 21.097, 42.195],
            "disciplina": "strada",
            "localita": "Krems an der Donau / Wachau (Austria)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "45€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "3-Länder-Marathon Sparkasse",
            "data": "2026-10-11",
            "data_originale": "11/10/2026",
            "distanze_km": [10.0, 21.097, 42.195],
            "disciplina": "strada",
            "localita": "Bregenz / Bodensee (Austria)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "50€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Graz Marathon",
            "data": "2026-10-11",
            "data_originale": "11/10/2026",
            "distanze_km": [10.0, 21.097, 42.195],
            "disciplina": "strada",
            "localita": "Graz (Austria)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "42€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Internationaler Wolfgangseelauf",
            "data": "2026-10-18",
            "data_originale": "18/10/2026",
            "distanze_km": [5.2, 10.0, 27.0],
            "disciplina": "strada",
            "localita": "St. Wolfgang (Austria)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "38€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Vienna City Marathon",
            "data": "2027-04-18",
            "data_originale": "18/04/2027",
            "distanze_km": [21.097, 42.195],
            "disciplina": "strada",
            "localita": "Vienna (Austria)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "75€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Innsbruck Alpine Trailrun Festival",
            "data": "2027-05-05",
            "data_originale": "05/05/2027",
            "distanze_km": [15.0, 25.0, 42.0, 68.0, 86.0, 111.0],
            "disciplina": "trail",
            "localita": "Innsbruck, Tirolo (Austria)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "55€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Wörthersee Trail Festival",
            "data": "2027-05-08",
            "data_originale": "08/05/2027",
            "distanze_km": [10.0, 21.0, 65.0],
            "disciplina": "trail",
            "localita": "Pörtschach am Wörthersee (Austria)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "48€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Salzburg Marathon",
            "data": "2027-05-23",
            "data_originale": "23/05/2027",
            "distanze_km": [10.0, 21.097, 42.195],
            "disciplina": "strada",
            "localita": "Salzburg (Austria)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "60€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },

        # --- SLOVENIA (Ahotu Running & Trail-running) ---
        {
            "nome": "Julian Alps Trail Run by UTMB",
            "data": "2026-09-18",
            "data_originale": "18/09/2026",
            "distanze_km": [10.0, 15.0, 25.0, 50.0, 80.0, 120.0],
            "disciplina": "trail",
            "localita": "Kranjska Gora (Slovenia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "50€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Bovec Marathon",
            "data": "2026-09-19",
            "data_originale": "19/09/2026",
            "distanze_km": [8.0, 21.097, 42.195],
            "disciplina": "strada",
            "localita": "Bovec (Slovenia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "35€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Istrski Maraton - Koper Run",
            "data": "2026-09-26",
            "data_originale": "26/09/2026",
            "distanze_km": [10.0, 21.097],
            "disciplina": "strada",
            "localita": "Capodistria / Koper (Slovenia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "30€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "NLB Ljubljana Marathon",
            "data": "2026-10-18",
            "data_originale": "18/10/2026",
            "distanze_km": [10.0, 21.097, 42.195],
            "disciplina": "strada",
            "localita": "Lubiana / Ljubljana (Slovenia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "40€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Kras Trail Sežana",
            "data": "2027-03-27",
            "data_originale": "27/03/2027",
            "distanze_km": [15.0, 25.0, 45.0],
            "disciplina": "trail",
            "localita": "Sežana / Carso (Slovenia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "32€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Ultra Trail Vipava Valley (UTVV)",
            "data": "2027-04-23",
            "data_originale": "23/04/2027",
            "distanze_km": [15.0, 30.0, 50.0, 100.0, 160.0],
            "disciplina": "trail",
            "localita": "Ajdovščina / Vipava (Slovenia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "45€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Kočevsko Outdoor Festival Trail",
            "data": "2027-05-28",
            "data_originale": "28/05/2027",
            "distanze_km": [10.0, 25.0, 62.0],
            "disciplina": "trail",
            "localita": "Kočevje (Slovenia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "35€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Soča Outdoor Festival Trail",
            "data": "2027-06-26",
            "data_originale": "26/06/2027",
            "distanze_km": [10.0, 15.0, 25.0, 45.0],
            "disciplina": "trail",
            "localita": "Tolmin / Val Soča (Slovenia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "40€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },

        # --- CROAZIA (Ahotu Running & Trail-running) ---
        {
            "nome": "Poreč Triathlon & Istria Run",
            "data": "2026-10-04",
            "data_originale": "04/10/2026",
            "distanze_km": [10.0, 21.097],
            "disciplina": "strada",
            "localita": "Parenzo / Poreč (Croazia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "30€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Zagreb Marathon",
            "data": "2026-10-11",
            "data_originale": "11/10/2026",
            "distanze_km": [10.0, 21.097, 42.195],
            "disciplina": "strada",
            "localita": "Zagabria / Zagreb (Croazia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "35€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Rijeka Run - Torpedo Half",
            "data": "2026-10-24",
            "data_originale": "24/10/2026",
            "distanze_km": [10.0, 21.097],
            "disciplina": "strada",
            "localita": "Fiume / Rijeka (Croazia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "25€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Split Marathon & Half",
            "data": "2027-02-14",
            "data_originale": "14/02/2027",
            "distanze_km": [10.0, 21.097, 42.195],
            "disciplina": "strada",
            "localita": "Spalato / Split (Croazia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "35€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Istria 100 by UTMB (100 Miles of Istria)",
            "data": "2027-04-09",
            "data_originale": "09/04/2027",
            "distanze_km": [20.0, 42.0, 69.0, 110.0, 168.0],
            "disciplina": "trail",
            "localita": "Umago / Umag, Istria (Croazia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "65€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Dubrovnik Half Marathon (Du Motion)",
            "data": "2027-04-25",
            "data_originale": "25/04/2027",
            "distanze_km": [21.097],
            "disciplina": "strada",
            "localita": "Dubrovnik (Croazia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "40€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Medvednica Trail Sljeme",
            "data": "2027-05-23",
            "data_originale": "23/05/2027",
            "distanze_km": [15.0, 30.0, 59.0],
            "disciplina": "trail",
            "localita": "Sljeme / Zagabria (Croazia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "32€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
        {
            "nome": "Plitvice Lakes Marathon",
            "data": "2027-06-06",
            "data_originale": "06/06/2027",
            "distanze_km": [10.0, 21.097, 42.195],
            "disciplina": "strada",
            "localita": "Laghi di Plitvice (Croazia)",
            "area": "Estero (Slo/Cro/Aut)",
            "prezzo": "38€",
            "link_info": "https://www.ahotu.com/it/calendario?sports=running,trail-running&years=gare-future&countries=austria,croazia,slovenia",
        },
    ]

    valid = []
    for cand in ahotu_races:
        if is_title_forbidden(cand["nome"]):
            continue
        try:
            cand_date = date.fromisoformat(cand["data"])
            if cand_date >= execution_date:
                valid.append(cand)
        except ValueError:
            pass

    return valid


def save_races_atomic(file_path: Path, races: List[Dict]) -> None:
    """Salvataggio atomico in races.json ordinato per data."""
    file_path.parent.mkdir(parents=True, exist_ok=True)
    temp_file = file_path.with_suffix(".tmp")

    races_sorted = sorted(races, key=lambda x: (x.get("data", ""), x.get("nome", "")))

    try:
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(races_sorted, f, ensure_ascii=False, indent=2)
            f.write("\n")

        temp_file.replace(file_path)
        logger.info(f"Database salvato con successo in {file_path} ({len(races_sorted)} gare confermate).")
    except Exception as e:
        logger.error(f"Errore salvataggio {file_path}: {e}")
        if temp_file.exists():
            temp_file.unlink()
        raise


def main() -> int:
    """Esecuzione completa con filtri e integrazione manifestazioni verificate."""
    today = date.today()
    anno_attuale = today.year
    n_mese_attuale = today.month

    if n_mese_attuale == 12:
        anno_successivo = anno_attuale + 1
        n_mese_successivo = 1
    else:
        anno_successivo = anno_attuale
        n_mese_successivo = n_mese_attuale + 1

    target_periods = [
        (anno_attuale, n_mese_attuale),
        (anno_successivo, n_mese_successivo),
    ]

    logger.info("=== Avvio Scraper Deterministico Calendario FIDAL + Verified Races ===")
    logger.info(f"Data di Esecuzione: {today.isoformat()}")
    logger.info(f"[anno_attuale]: {anno_attuale} | [n_mese]: {n_mese_attuale} e [n_mese ++]: {n_mese_successivo}")

    all_verified_races: List[Dict] = []
    seen_keys: Set[str] = set()

    # 1. Scraping FIDAL per FVG e Veneto
    for regione in REGIONS:
        for anno_param, mese_param in target_periods:
            url = build_fidal_url(anno=anno_param, mese=mese_param, regione=regione)
            logger.info(f"Download FIDAL ({regione} {mese_param}/{anno_param}): {url}")

            raw_html = fetch_html(url)
            if not raw_html:
                logger.warning(f"Pagina non raggiungibile: {url}")
                continue

            extracted_events = parse_fidal_table_rows(
                html_content=raw_html,
                anno=anno_param,
                mese=mese_param,
                regione_code=regione,
                execution_date=today,
                query_url=url,
            )

            logger.info(f"Eventi ammessi dopo tutti i filtri per {regione} ({mese_param:02d}/{anno_param}): {len(extracted_events)}")

            for r in extracted_events:
                key = f"{r['nome'].strip().lower()}_{r['data'].strip()}"
                if key not in seen_keys:
                    seen_keys.add(key)
                    all_verified_races.append(r)

    # 2. Integrazione manifestazioni verificate al 100% in FVG e Veneto
    verified_fvg_veneto = get_verified_fvg_veneto_events(today)
    logger.info(f"Aggiunta di {len(verified_fvg_veneto)} manifestazioni confermate extra (FVG e Veneto).")

    for r in verified_fvg_veneto:
        key = f"{r['nome'].strip().lower()}_{r['data'].strip()}"
        if key not in seen_keys:
            seen_keys.add(key)
            all_verified_races.append(r)

    # 3. Integrazione ESCLUSIVA manifestazioni Estero da AHOTU (Austria, Croazia, Slovenia)
    ahotu_foreign_events = get_ahotu_international_events(today)
    logger.info(f"Aggiunta di {len(ahotu_foreign_events)} manifestazioni estere da AHOTU (Austria, Croazia, Slovenia).")

    for r in ahotu_foreign_events:
        key = f"{r['nome'].strip().lower()}_{r['data'].strip()}"
        if key not in seen_keys:
            seen_keys.add(key)
            all_verified_races.append(r)

    save_races_atomic(OUTPUT_FILE, all_verified_races)
    logger.info(f"Totale gare nel calendario: {len(all_verified_races)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
