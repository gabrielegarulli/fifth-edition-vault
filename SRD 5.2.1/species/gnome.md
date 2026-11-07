---
title: Gnome
source: SRD 5.2.1
edition: SRD 5.2.1
size: Small
speed: 30 ft.
creature_type: humanoid
darkvision: 60
tags:
  - species
  - size/small
  - srd-5-2-1
aliases:
  - Gnome
export_hash: sha256-aff1a0d1065b
---

# Gnome

*Small, 30 ft. | Source: SRD 5.2.1*

**Darkvision.** You have Darkvision with a range of 60 feet.

**Gnomish Cunning.** You have Advantage on Intelligence, Wisdom, and Charisma saving throws.

**Gnomish Lineage.** You are part of a lineage that grants you supernatural abilities. Choose one of the following options; whichever one you choose, Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage):

- **Forest Gnome:** You know the Minor Illusion cantrip. You also always have the Speak with Animals spell prepared. You can cast it without a spell slot a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest. You can also use any spell slots you have to cast the spell.
- **Rock Gnome:** You know the Mending and Prestidigitation cantrips. In addition, you can spend 10 minutes casting Prestidigitation to create a Tiny clockwork device (AC 5, 1 HP), such as a toy, fire starter, or music box. When you create the device, you determine its function by choosing one effect from Prestidigitation; the device produces that effect whenever you or another creature takes a Bonus Action to activate it with a touch. If the chosen effect has options within it, you choose one of those options for the device when you create it. For example, if you choose the spell's ignite-extinguish effect, you determine whether the device ignites or extinguishes fire; the device doesn't do both. You can have three such devices in existence at a time, and each falls apart 8 hours after its creation or when you dismantle it with a touch as a Utilize action.

```vault-species
traits:
  - key: darkvision
    name: Darkvision
    text: You have Darkvision with a range of 60 feet.
  - key: gnomish_cunning
    name: Gnomish Cunning
    text: You have Advantage on Intelligence, Wisdom, and Charisma saving throws.
  - key: gnomish_lineage
    name: Gnomish Lineage
    text: |-
      You are part of a lineage that grants you supernatural abilities. Choose one of the following options; whichever one you choose, Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage):

      - **Forest Gnome:** You know the Minor Illusion cantrip. You also always have the Speak with Animals spell prepared. You can cast it without a spell slot a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest. You can also use any spell slots you have to cast the spell.
      - **Rock Gnome:** You know the Mending and Prestidigitation cantrips. In addition, you can spend 10 minutes casting Prestidigitation to create a Tiny clockwork device (AC 5, 1 HP), such as a toy, fire starter, or music box. When you create the device, you determine its function by choosing one effect from Prestidigitation; the device produces that effect whenever you or another creature takes a Bonus Action to activate it with a touch. If the chosen effect has options within it, you choose one of those options for the device when you create it. For example, if you choose the spell's ignite-extinguish effect, you determine whether the device ignites or extinguishes fire; the device doesn't do both. You can have three such devices in existence at a time, and each falls apart 8 hours after its creation or when you dismantle it with a touch as a Utilize action.
speciesSpellcasting:
  trait: Gnomish Lineage
  ability:
    choose:
      - int
      - wis
      - cha
  lineages:
    - name: Forest Gnome
      benefit: You know the Minor Illusion cantrip. You also always have the Speak with Animals spell prepared. You can cast it without a spell slot a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest. You can also use any spell slots you have to cast the spell.
      spells:
        - level: 1
          key: minor illusion
          cantrip: true
          kind: known
          id: minor-illusion
          name: Minor Illusion
        - level: 1
          key: speak with animals
          cantrip: false
          kind: innate
          uses: pb
          id: speak-with-animals
          name: Speak with Animals
      authoredLocally: true
    - name: Rock Gnome
      benefit: You know the Mending and Prestidigitation cantrips. In addition, you can spend 10 minutes casting Prestidigitation to create a Tiny clockwork device (AC 5, 1 HP), such as a toy, fire starter, or music box. When you create the device, you determine its function by choosing one effect from Prestidigitation; the device produces that effect whenever you or another creature takes a Bonus Action to activate it with a touch. If the chosen effect has options within it, you choose one of those options for the device when you create it. For example, if you choose the spell's ignite-extinguish effect, you determine whether the device ignites or extinguishes fire; the device doesn't do both. You can have three such devices in existence at a time, and each falls apart 8 hours after its creation or when you dismantle it with a touch as a Utilize action.
      spells:
        - level: 1
          key: mending
          cantrip: true
          kind: known
          id: mending
          name: Mending
        - level: 1
          key: prestidigitation
          cantrip: true
          kind: known
          id: prestidigitation
          name: Prestidigitation
      authoredLocally: true
```
