# Launcher and Bridge Architecture

## Launcher responsibility

The launcher is the single user-facing owner of local subsystem startup.

It manages:

- web application;
- audio service;
- analysis service;
- QLC Bridge;
- direct output service;
- active fixture setup;
- system status.

## Required actions

- Start System;
- Stop System;
- Start QLC Bridge;
- Stop QLC Bridge;
- select active setup;
- select output path;
- view device status;
- view actionable errors.

## State machine

stopped -> starting -> running -> stopping -> stopped

Any failure enters error and performs cleanup.

## Idempotency

Repeated Start must not create duplicate processes.

Repeated Stop must not fail.

The launcher must recover from stale PID/state data by validating the real process.

## Health

Separate indicators are required for:

- service process;
- bridge process;
- QLC connection;
- USB device;
- DMX output.

## Shutdown

Stop System and application quit must:

- stop output;
- release USB/serial handles;
- stop bridge;
- stop analysis;
- stop audio capture;
- remove temporary ownership state.