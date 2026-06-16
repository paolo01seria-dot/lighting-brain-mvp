# Output Architecture

## Domanda chiave

Il nostro output deve essere DMX diretto o comandi integrabili con software luci
come QLC+?

## Decisione consigliata

Per l'MVP l'output non deve essere DMX diretto.

Deve essere una timeline/event stream astratta, convertibile in:

- OSC verso QLC+
- MIDI verso QLC+ o altri software
- Art-Net/sACN in una fase successiva
- DMX diretto solo quando avremo davvero bisogno di bypassare i software luci

## Perche' non DMX diretto subito

DMX diretto significa assumersi subito:

- patch fixture
- canali DMX
- personality fixture
- dimmer, pan, tilt, colore, gobos, shutter, strobo
- compatibilita' interfacce USB-DMX
- gestione universe
- sicurezza dei valori inviati alle luci

Questa parte e' enorme e QLC+ la fa gia'.

## Perche' QLC+ come primo target

QLC+ e' open source e supporta protocolli adatti a integrazioni esterne:

- OSC
- MIDI
- Art-Net
- sACN/E1.31
- DMX USB tramite plugin

Questo ci permette di fare il cervello musicale e lasciare a QLC+ il lavoro
sporco della gestione luci.

## Architettura proposta

```text
Rekordbox / file / live audio
-> player adapter
-> music analysis
-> genre profile
-> lighting intent timeline
-> output adapter
-> QLC+ scene/function trigger
-> DMX hardware
```

## Formato interno

Il nostro formato interno deve descrivere intenzioni, non canali DMX:

```json
{
  "time": 64.0,
  "intent": "peak_energy",
  "scene": "techno_peak_white_drive",
  "target": "qlcplus",
  "transport": "osc"
}
```

Poi un adapter traduce questo in comandi specifici.

## Due idee a confronto

### Idea A: cervello che controlla QLC+

Pro:

- piu' veloce da prototipare
- meno codice hardware
- usa QLC+ per fixture, patch e output DMX
- facile da testare senza luci fisiche
- resta compatibile con altri software via adapter

Contro:

- dipende da una configurazione QLC+
- dobbiamo mappare bene scene/funzioni QLC+

Verdetto: strada migliore per MVP e prime feste.

### Idea B: integrare parti di QLC+ e creare un'app completa

Pro:

- controllo totale dell'esperienza
- interfaccia unica
- potenziale prodotto piu' autonomo

Contro:

- QLC+ e' grande e complesso
- bisogna valutare bene licenza, architettura e linguaggio
- molto piu' lento arrivare a un risultato usabile
- rischiamo di ricostruire fixture editor, patching e output prima ancora di
  validare il cervello musicale

Verdetto: interessante piu' avanti, non come primo passo.

## Roadmap output

1. JSON timeline interna.
2. Export leggibile per debug.
3. OSC adapter verso QLC+.
4. MIDI adapter.
5. Art-Net/sACN adapter solo se serve output piu' diretto.
6. Valutazione integrazione codice QLC+ dopo aver validato il prodotto.

## Confine DMX interno preparatorio

Il progetto ora puo' preparare un output DMX diretto senza togliere QLC+.
Il confine pulito e':

```text
canonical light state / web scene
-> fixture scene {fixture_id: rgb/intensity}
-> OutputDriver
-> 512-channel DMX universe
-> transport reale o mock
```

La sorgente di verita' futura per la fixture map e' Setup Light. Il payload
salvato dalla webapp contiene gia' una forma compatibile (`fixtures` e
`qlcFixtures`), quindi Mock, QLC+ e il futuro FTDI devono consumare la stessa
mappa caricata da Setup Light invece di duplicare configurazioni.

Il mapping reale testato sui 6 fari vive solo come preset:

- `SIX_LIGHT_TEST_PRESET`
- `factory_default_fixture_map()`

Questo preset serve per test, demo, primo avvio e fallback. Non deve essere
interpretato come configurazione finale hardcoded.

Driver previsti:

- `MockDmxDriver`: universo interno a 512 canali per test/debug.
- `ProtectedDirectFtdiOpenDmxAdapter`: scaffold beta 0.1 per il cavo
  `FT232R USB UART (S/N: BG03EQH8)`. Rileva il target, ma non apre ancora USB e
  non scrive DMX reale.
- `InternalFtdiDmxDriver`: prossimo driver hardware diretto FTDI/OpenDMX.
- `QlcOutputDriver`: fallback/emergenza/debug, delega al bridge QLC+.

Direzione beta 0.1 principale:

```text
Lighting Brain desktop app
-> direct FTDI/OpenDMX driver
-> FT232R USB UART cable
-> DMX fixtures
```

Direzione fallback:

```text
Lighting Brain desktop app
-> QLC Bridge
-> QLC+
-> USB-DMX cable
-> DMX fixtures
```

QLC+ non deve piu' essere considerato il bridge obbligatorio sempre acceso. Deve
restare disponibile come strada di sicurezza mentre il driver diretto matura.
Il target immediato del driver diretto e' solo il cavo osservato:

- nome: `FT232R USB UART`
- seriale: `BG03EQH8`
- protocollo previsto: OpenTX/OpenDMX
- backend previsto su macOS: `libftdi1`/`libusb`

L'universo e la frequenza di output devono restare configurabili. Non vanno
hardcodati come "Universe 1" o "30Hz". Il valore iniziale puo' essere default,
ma deve passare da configurazione.

Il primo pezzo implementato e' volutamente solo mock:

- `DmxUniverse.set_channel(channel, value)`
- `DmxUniverse.get_channel(channel)`
- `DmxUniverse.snapshot()`
- `DmxUniverse.get_changed_channels(previous_snapshot)`
- `MockDmxDriver.set_fixture_color(fixture_id, r, g, b, intensity)`
- `MockDmxDriver.set_fixture_blackout(fixture_id)`
- `MockDmxDriver.set_fixture_strobe(fixture_id, value)`
- `MockDmxDriver.apply_simple_light_state(fixture_id, state)`
- `MockDmxDriver.set_scene({fixtures: ...})`
- `MockDmxDriver.blackout()`
- `MockDmxDriver.serialize()`
- `MockDmxDriver.active_channel_table()`
- `DirectFtdiOutputConfig(universe, output_frequency_hz, target_serial)`
- `DirectFtdiProbe`
- `ProtectedDirectFtdiOpenDmxAdapter`

La mappa fixture supporta gia':

- RGB 3CH: `r`, `g`, `b`
- RGB 6CH: `dimmer`, `r`, `g`, `b`, `strobe`, `mode`
- Dual RGBW 12CH: `dimmer`, `r/g/b/white`, `r2/g2/b2/white2`, `strobe`, `mode`, `speed`

Caricamento previsto:

- `configs/light-setups/` contiene i Setup Light JSON salvati disponibili nel
  launcher desktop.
- `configs/light_setup_selection.json` contiene il setup selezionato come
  current/default.
- `load_selected_fixture_map()` legge la selezione corrente per dry-run e
  diagnostica.
- `load_fixture_map("configs/fixture_map.json")` resta compatibile con il file
  legacy/singolo.
- `setup_light_payload_to_fixture_map(payload)` per usare direttamente il formato
  prodotto da Setup Light.
- fallback al preset solo quando non c'e' ancora una mappa utente.

Regole di sicurezza del layer DMX:

- valori sempre clampati a `0..255`;
- canali validati in `1..512`;
- `strobe`, `mode`, `speed` restano a `0` in colore RGB normale;
- i canali white restano a `0` finche' non aggiungiamo una logica white esplicita;
- QLC+ rimane disponibile come output fallback.

Test manuale sicuro, senza hardware:

```bash
python3 scripts/dmx_mock_test.py
```

Questo comando crea un universo mock, accende alcuni fixture mappati, stampa i
canali DMX attivi e poi fa blackout. Non apre porte USB e non invia DMX reale.

## Software ponte alternativi

QLC+ e' il primo target, ma non l'unico. FreeStyler puo' essere interessante su
Windows per la compatibilita' con molte interfacce USB-DMX economiche. La scelta
del software ponte deve restare configurabile tramite adapter.

Vedi `bridge_software_targets.md`.
