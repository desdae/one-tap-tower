"""Inspect the Play listing or promote the newest closed-test build to production.

Reads the service account JSON from the PLAY_SA_JSON env var (GitHub secret) and the request
from play/request.json. mode "inspect" opens an edit, prints tracks/listing/details and deletes
the edit (changes nothing). mode "release" copies the newest release on from_track to production
(status completed) with the en-US notes and commits, which sends it to Google for review.
Never prints the key.
"""
import json, os, sys
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

PKG = "com.desdae.onetaptower"
BASE = f"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{PKG}"


def session():
    info = json.loads(os.environ["PLAY_SA_JSON"])
    creds = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/androidpublisher"])
    creds.refresh(Request())
    s = requests.Session()
    s.headers["Authorization"] = f"Bearer {creds.token}"
    print("service account:", info.get("client_email"))
    return s


def call(s, method, path, **kw):
    r = s.request(method, BASE + path, **kw)
    if r.status_code >= 400:
        print(f"{method} {path} -> {r.status_code}: {r.text[:1500]}")
        return None
    return r.json() if r.text else {}


def show(label, data):
    print(f"\n=== {label} ===")
    print(json.dumps(data, ensure_ascii=False)[:6000].replace("{", "(").replace("}", ")"))


def newest_release(track):
    rels = [r for r in (track or {}).get("releases", []) if r.get("versionCodes")]
    rels.sort(key=lambda r: max(int(v) for v in r["versionCodes"]), reverse=True)
    return rels[0] if rels else None


def main():
    req = json.load(open("play/request.json"))
    mode = req.get("mode", "inspect")
    s = session()
    edit = call(s, "POST", "/edits", json={})
    if not edit:
        sys.exit(1)
    eid = edit["id"]
    tracks = call(s, "GET", f"/edits/{eid}/tracks") or {}
    show("tracks", tracks)
    src = next((t for t in tracks.get("tracks", []) if t["track"] == req["from_track"]), None)
    rel = newest_release(src)
    show(f"newest release on {req['from_track']}", rel)

    if mode == "inspect":
        show("details", call(s, "GET", f"/edits/{eid}/details"))
        listings = call(s, "GET", f"/edits/{eid}/listings") or {}
        show("listings", listings)
        for lang in [l["language"] for l in listings.get("listings", [])] or ["en-US"]:
            counts = {}
            for kind in ["icon", "featureGraphic", "phoneScreenshots", "sevenInchScreenshots",
                         "tenInchScreenshots", "promoGraphic"]:
                imgs = call(s, "GET", f"/edits/{eid}/listings/{lang}/{kind}") or {}
                counts[kind] = len(imgs.get("images", []))
            show(f"images {lang}", counts)
        for t in ["production", req["from_track"]]:
            ca = call(s, "GET", f"/edits/{eid}/countryAvailability/{t}") or {}
            codes = [c["countryCode"] for c in ca.get("countries", [])]
            print(f"\n=== country availability {t} === restOfWorld={ca.get('restOfWorld')} count={len(codes)} "
                  f"LV={'LV' in codes} US={'US' in codes}")
        show("testers " + req["from_track"], call(s, "GET", f"/edits/{eid}/testers/{req['from_track']}"))
        call(s, "DELETE", f"/edits/{eid}")
        print("\ninspect done, edit deleted, nothing changed")
        return

    if mode != "release":
        sys.exit(f"unknown mode {mode}")
    if not rel:
        sys.exit("no release with version codes on the source track")
    notes = req["release_notes_en_US"]
    assert len(notes) <= 500, len(notes)
    body = {"track": "production", "releases": [{
        "name": rel.get("name") or str(max(rel["versionCodes"])),
        "versionCodes": rel["versionCodes"],
        "status": "completed",
        "releaseNotes": [{"language": "en-US", "text": notes}],
    }]}
    show("production track request", body)
    put = call(s, "PUT", f"/edits/{eid}/tracks/production", json=body)
    if put is None:
        call(s, "DELETE", f"/edits/{eid}")
        sys.exit(1)
    show("production track after update", put)
    v = call(s, "POST", f"/edits/{eid}:validate")
    if v is None:
        call(s, "DELETE", f"/edits/{eid}")
        sys.exit(1)
    done = call(s, "POST", f"/edits/{eid}:commit")
    if done is None:
        print("commit refused; trying changesNotSentForReview=true would only help with managed publishing")
        call(s, "DELETE", f"/edits/{eid}")
        sys.exit(1)
    show("committed", done)
    print("\nrelease committed: production release sent to Google for review")


if __name__ == "__main__":
    main()
