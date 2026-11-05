---
title: Tiefling
source: SRD 5.2.1
edition: SRD 5.2.1
size: Small or Medium
speed: 30 ft.
creature_type: humanoid
darkvision: 60
tags:
  - species
  - size/small
  - size/medium
  - srd-5-2-1
aliases:
  - Tiefling
export_hash: sha256-b8fda48ab5c5
---

# Tiefling

*Small or Medium, 30 ft. | Source: SRD 5.2.1*

**Darkvision.** You have Darkvision with a range of 60 feet.

**Fiendish Legacy.** You are the recipient of a legacy that grants you supernatural abilities. Choose a legacy from the Fiendish Legacies table. You gain the level 1 benefit of the chosen legacy.

When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table. You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level. Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the legacy).

**Fiendish Legacies**
| Legacy | Level 1 | Level 3 | Level 5 |
| --- | --- | --- | --- |
| Abyssal | You have Resistance to Poison damage. You also know the Poison Spray cantrip. | Ray of Sickness | Hold Person |
| Chthonic | You have Resistance to Necrotic damage. You also know the Chill Touch cantrip. | False Life | Ray of Enfeeblement |
| Infernal | You have Resistance to Fire damage. You also know the Fire Bolt cantrip. | Hellish Rebuke | Darkness |

**Otherworldly Presence.** You know the Thaumaturgy cantrip. When you cast it with this trait, the spell uses the same spellcasting ability you use for your Fiendish Legacy Trait.

```vault-species
traits:
  - key: darkvision
    name: Darkvision
    text: You have Darkvision with a range of 60 feet.
  - key: fiendish_legacy
    name: Fiendish Legacy
    text: |-
      You are the recipient of a legacy that grants you supernatural abilities. Choose a legacy from the Fiendish Legacies table. You gain the level 1 benefit of the chosen legacy.

      When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table. You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level. Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the legacy).

      **Fiendish Legacies**
      | Legacy | Level 1 | Level 3 | Level 5 |
      | --- | --- | --- | --- |
      | Abyssal | You have Resistance to Poison damage. You also know the Poison Spray cantrip. | Ray of Sickness | Hold Person |
      | Chthonic | You have Resistance to Necrotic damage. You also know the Chill Touch cantrip. | False Life | Ray of Enfeeblement |
      | Infernal | You have Resistance to Fire damage. You also know the Fire Bolt cantrip. | Hellish Rebuke | Darkness |
  - key: otherworldly_presence
    name: Otherworldly Presence
    text: You know the Thaumaturgy cantrip. When you cast it with this trait, the spell uses the same spellcasting ability you use for your Fiendish Legacy Trait.
speciesSpellcasting:
  trait: Fiendish Legacy
  ability:
    choose:
      - int
      - wis
      - cha
  lineages:
    - name: Abyssal
      benefit: You have Resistance to Poison damage. You also know the Poison Spray cantrip.
      spells:
        - level: 1
          key: poison spray
          cantrip: true
          kind: known
          id: poison-spray
          name: Poison Spray
        - level: 1
          key: thaumaturgy
          cantrip: true
          kind: known
          id: thaumaturgy
          name: Thaumaturgy
        - level: 3
          key: ray of sickness
          cantrip: false
          kind: innate
          uses: 1
          id: ray-of-sickness
          name: Ray of Sickness
        - level: 5
          key: hold person
          cantrip: false
          kind: innate
          uses: 1
          id: hold-person
          name: Hold Person
    - name: Chthonic
      benefit: You have Resistance to Necrotic damage. You also know the Chill Touch cantrip.
      spells:
        - level: 1
          key: chill touch
          cantrip: true
          kind: known
          id: chill-touch
          name: Chill Touch
        - level: 1
          key: thaumaturgy
          cantrip: true
          kind: known
          id: thaumaturgy
          name: Thaumaturgy
        - level: 3
          key: false life
          cantrip: false
          kind: innate
          uses: 1
          id: false-life
          name: False Life
        - level: 5
          key: ray of enfeeblement
          cantrip: false
          kind: innate
          uses: 1
          id: ray-of-enfeeblement
          name: Ray of Enfeeblement
    - name: Infernal
      benefit: You have Resistance to Fire damage. You also know the Fire Bolt cantrip.
      spells:
        - level: 1
          key: fire bolt
          cantrip: true
          kind: known
          id: fire-bolt
          name: Fire Bolt
        - level: 1
          key: thaumaturgy
          cantrip: true
          kind: known
          id: thaumaturgy
          name: Thaumaturgy
        - level: 3
          key: hellish rebuke
          cantrip: false
          kind: innate
          uses: 1
          id: hellish-rebuke
          name: Hellish Rebuke
        - level: 5
          key: darkness
          cantrip: false
          kind: innate
          uses: 1
          id: darkness
          name: Darkness
```
