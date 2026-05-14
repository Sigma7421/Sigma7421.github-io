# RoundCaller

A local browser prototype for a smart heavy-bag round caller. It speaks boxing combinations, listens for bag-impact peaks through the microphone, advances after the expected number of hits, and tracks basic round stats.

## Run

Use a local server so browser microphone permissions work:

```powershell
.\start-roundcaller.ps1
```

Then open:

```text
http://localhost:5173
```

To open it on a phone, keep the computer and phone on the same Wi-Fi, run the server, and use the `Phone on same Wi-Fi` URL printed in the terminal.

## Notes

- Audio detection counts impact spikes, not punch type.
- Use **Calibrate mic** before training if the room or bag is noisy.
- Use **Simulate hit** to test the flow without microphone access.
