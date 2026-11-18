# Targeted equipment-controller verification

This check reuses the ordinary quest character and two identical Linh Giáp Vệ rows. Every mutation uses the real inventory UI; no item or stat is injected. The revised controller selects the visible equipped/unequipped badge, scopes the action to the selected detail, and checks that exactly one previously eligible server row changes state.

All11 commands passed in18.237seconds, with251 authoritative TICK messages, zero page errors, zero command failures and successful cleanup. The real remove/equip/reload sequence produced:

| State | Max HP | DEF |
| --- | ---: | ---: |
| Initially equipped | 160 | 22 |
| Armor removed | 120 | 10 |
| One matching armor equipped | 160 | 22 |
| After reload | 160 | 22 |

The exact controller source is in `harness-source.zip`, the actions and authoritative reads are in `commands.json`, and `assertions.json` records the checked postconditions. This short check closes the duplicate-item controller issue; it is not a new long gameplay acceptance run. It did not use a consumable, so the revised total-quantity debit assertion was source-reviewed separately.
