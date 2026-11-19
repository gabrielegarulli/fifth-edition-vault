---
title: Goliath
source: SRD 5.2.1
edition: SRD 5.2.1
size: Medium
speed: 35 ft.
creature_type: humanoid
tags:
  - species
  - size/medium
  - srd-5-2-1
aliases:
  - Goliath
export_hash: sha256-afa5e28c673f
---

# Goliath

*Medium, 35 ft. | Source: SRD 5.2.1*

**Giant Ancestry.** You are descended from Giants. Choose one of the following benefits—a supernatural boon from your ancestry; you can use the chosen benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest:

- **Cloud's Jaunt (Cloud Giant):** As a Bonus Action, you magically teleport up to 30 feet to an unoccupied space you can see.
- **Fire's Burn (Fire Giant):** When you hit a target with an attack roll and deal damage to it, you can also deal 1d10 Fire damage to that target.
- **Frost's Chill (Frost Giant):** When you hit a target with an attack roll and deal damage to it, you can also deal 1d6 Cold damage to that target and reduce its Speed by 10 feet until the start of your next turn.
- **Hill's Tumble (Hill Giant):** When you hit a Large or smaller creature with an attack roll and deal damage to it, you can give that target the [[Prone]] condition.
- **Stone's Endurance (Stone Giant):** When you take damage, you can take a Reaction to roll 1d12. Add your Constitution modifier to the number rolled and reduce the damage by that total.
- **Storm's Thunder (Storm Giant):** When you take damage from a creature within 60 feet of you, you can take a Reaction to deal 1d8 Thunder damage to that creature.

**Large Form.** Starting at character level 5, you can change your size to Large as a Bonus Action if you're in a big enough space. This transformation lasts for 10 minutes or until you end it (no action required). For that duration, you have Advantage on Strength checks, and your Speed increases by 10 feet. Once you use this trait, you can't use it again until you finish a Long Rest.

**Powerful Build.** You have Advantage on any ability check you make to end the [[Grappled]] condition. You also count as one size larger when determining your carrying capacity.

```vault-species
traits:
  - key: giant_ancestry
    name: Giant Ancestry
    text: |-
      You are descended from Giants. Choose one of the following benefits—a supernatural boon from your ancestry; you can use the chosen benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest:

      - **Cloud's Jaunt (Cloud Giant):** As a Bonus Action, you magically teleport up to 30 feet to an unoccupied space you can see.
      - **Fire's Burn (Fire Giant):** When you hit a target with an attack roll and deal damage to it, you can also deal 1d10 Fire damage to that target.
      - **Frost's Chill (Frost Giant):** When you hit a target with an attack roll and deal damage to it, you can also deal 1d6 Cold damage to that target and reduce its Speed by 10 feet until the start of your next turn.
      - **Hill's Tumble (Hill Giant):** When you hit a Large or smaller creature with an attack roll and deal damage to it, you can give that target the Prone condition.
      - **Stone's Endurance (Stone Giant):** When you take damage, you can take a Reaction to roll 1d12. Add your Constitution modifier to the number rolled and reduce the damage by that total.
      - **Storm's Thunder (Storm Giant):** When you take damage from a creature within 60 feet of you, you can take a Reaction to deal 1d8 Thunder damage to that creature.
  - key: large_form
    name: Large Form
    text: Starting at character level 5, you can change your size to Large as a Bonus Action if you're in a big enough space. This transformation lasts for 10 minutes or until you end it (no action required). For that duration, you have Advantage on Strength checks, and your Speed increases by 10 feet. Once you use this trait, you can't use it again until you finish a Long Rest.
  - key: powerful_build
    name: Powerful Build
    text: You have Advantage on any ability check you make to end the Grappled condition. You also count as one size larger when determining your carrying capacity.
versions:
  question: Giant Ancestry
  options:
    - name: Cloud Giant Ancestry
      traits:
        - key: giant_ancestry
          name: Giant Ancestry (Cloud)
          text: |-
            You are descended from Giants, granting you a supernatural boon; you can use this boon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest:

            - **Cloud's Jaunt:** As a Bonus Action, you magically teleport up to 30 feet to an unoccupied space you can see.
      effects:
        - type: feature_resource
          name: Cloud's Jaunt
          uses:
            kind: proficiency_bonus
          resets: long_rest
          detail: "Cloud's Jaunt: As a Bonus Action, you magically teleport up to 30 feet to an unoccupied space you can see."
    - name: Fire Giant Ancestry
      traits:
        - key: giant_ancestry
          name: Giant Ancestry (Fire)
          text: |-
            You are descended from Giants, granting you a supernatural boon; you can use this boon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest:

            - **Fire's Burn:** When you hit a target with an attack roll and deal damage to it, you can also deal 1d10 Fire damage to that target.
      effects:
        - type: feature_resource
          name: Fire's Burn
          uses:
            kind: proficiency_bonus
          resets: long_rest
          detail: "Fire's Burn: When you hit a target with an attack roll and deal damage to it, you can also deal 1d10 Fire damage to that target."
    - name: Frost Giant Ancestry
      traits:
        - key: giant_ancestry
          name: Giant Ancestry (Frost)
          text: |-
            You are descended from Giants, granting you a supernatural boon; you can use this boon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest:

            - **Frost's Chill:** When you hit a target with an attack roll and deal damage to it, you can also deal 1d6 Cold damage to that target and reduce its Speed by 10 feet until the start of your next turn.
      effects:
        - type: feature_resource
          name: Frost's Chill
          uses:
            kind: proficiency_bonus
          resets: long_rest
          detail: "Frost's Chill: When you hit a target with an attack roll and deal damage to it, you can also deal 1d6 Cold damage to that target and reduce its Speed by 10 feet until the start of your next turn."
    - name: Hill Giant Ancestry
      traits:
        - key: giant_ancestry
          name: Giant Ancestry (Hill)
          text: |-
            You are descended from Giants, granting you a supernatural boon; you can use this boon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest:

            - **Hill's Tumble:** When you hit a Large or smaller creature with an attack roll and deal damage to it, you can give that target the Prone condition.
      effects:
        - type: feature_resource
          name: Hill's Tumble
          uses:
            kind: proficiency_bonus
          resets: long_rest
          detail: "Hill's Tumble: When you hit a Large or smaller creature with an attack roll and deal damage to it, you can give that target the Prone condition."
    - name: Stone Giant Ancestry
      traits:
        - key: giant_ancestry
          name: Giant Ancestry (Stone)
          text: |-
            You are descended from Giants, granting you a supernatural boon; you can use this boon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest:

            - **Stone's Endurance:** When you take damage, you can take a Reaction to roll 1d12. Add your Constitution modifier to the number rolled and reduce the damage by that total.
      effects:
        - type: feature_resource
          name: Stone's Endurance
          uses:
            kind: proficiency_bonus
          resets: long_rest
          detail: "Stone's Endurance: When you take damage, you can take a Reaction to roll 1d12. Add your Constitution modifier to the number rolled and reduce the damage by that total."
    - name: Storm Giant Ancestry
      traits:
        - key: giant_ancestry
          name: Giant Ancestry (Storm)
          text: |-
            You are descended from Giants, granting you a supernatural boon; you can use this boon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest:

            - **Storm's Thunder:** When you take damage from a creature within 60 feet of you, you can take a Reaction to deal 1d8 Thunder damage to that creature.
      effects:
        - type: feature_resource
          name: Storm's Thunder
          uses:
            kind: proficiency_bonus
          resets: long_rest
          detail: "Storm's Thunder: When you take damage from a creature within 60 feet of you, you can take a Reaction to deal 1d8 Thunder damage to that creature."
```
