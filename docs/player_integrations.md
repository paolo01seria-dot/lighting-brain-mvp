# Player Integrations

## Obiettivo

L'app deve poter lavorare con Rekordbox come primo target, ma senza diventare
dipendente da un solo player.

Il modello giusto e':

```text
player input
-> normalized track state
-> music analysis
-> genre profile
-> lighting timeline / live lighting events
```

## Stato normalizzato

Ogni integrazione deve provare a produrre questi dati:

- player name
- track title
- artist
- file path, quando disponibile
- bpm
- beatgrid, quando disponibile
- phrase/section data, quando disponibile
- playback position
- play/pause state

Se un player non espone alcuni dati, il sistema deve compensare con analisi
audio propria.

## Strategia Rekordbox

Rekordbox e' il primo target perche' e' molto usato dai DJ e ha gia' analisi
track/phrase utili per il lighting.

Approccio consigliato:

1. Offline: leggere file audio o export/metadata quando disponibili.
2. Semi-live: usare posizione traccia e analisi precomputata.
3. Live fallback: leggere audio con `sounddevice` e rilevare onset/beat con
   `aubio` o feature custom.

Non assumiamo che Rekordbox offra sempre un'API pulita e universale. L'app deve
funzionare anche quando riceve solo audio.

## Roadmap input audio

Ordine consigliato:

1. File audio locale, gia' presente nella UI demo.
2. Mic Device / ingresso audio, utile per test rapidi e prototipi live.
3. Audio di sistema del Mac tramite dispositivo virtuale/loopback quando serve
   leggere qualunque player senza integrazione dedicata.
4. Rekordbox come player DJ prioritario: prima via file/export/metadata, poi
   sincronizzazione live se troviamo un canale stabile.
5. Spotify, Apple Music, Tidal e altri player consumer piu' avanti, trattandoli
   prima come sorgenti audio generiche e solo dopo come integrazioni specifiche.

Principio: prima catturiamo l'audio in modo affidabile dal Mac, poi aggiungiamo
adapter specifici per i player.

Nota terminologica: `Mic Device` indica microfono o ingresso audio esposto dal
browser. `System Audio` indica invece l'uscita audio del Mac, cioe' quello che
sta suonando Rekordbox/Spotify/altro anche se gli speaker sono a volume basso o
muti. Per `System Audio` su macOS serve in pratica un dispositivo loopback
virtuale o una app desktop nativa che legga l'audio di sistema.

## Altri player da considerare

- Serato DJ
- Traktor
- VirtualDJ
- Engine DJ
- Ableton Live
- Apple Music / Spotify / Tidal come sorgenti consumer, solo se legalmente e
  tecnicamente accessibili

## Menu sorgente audio/player

L'interfaccia futura dovrebbe avere un menu tipo:

- Load file
- Mic Device
- System Audio
- Rekordbox
- Serato
- Traktor
- VirtualDJ
- Engine DJ

Ogni sorgente usa un adapter diverso, ma il resto del sistema riceve sempre lo
stesso formato normalizzato.

## Principio

La versatilita' viene dagli adapter. La qualita' viene dalla nostra analisi e
dai profili genere. Non leghiamo il cervello luci a un singolo player.
