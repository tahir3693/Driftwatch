# Requirements Document

## Introduction

This spec covers the Driftwatch daily check-in: a screen where an astronaut answers a short form for each module (Environment, Radiation, Isolation, Gravity, Nutrition). Each submitted form is turned into Readings, saved through the Reading_Store, and the engine is re-run so the Dashboard alerts update. A streak counter rewards the habit of completing the check-in. The streak never depends on any reading value or alert status.

The check-in builds on the core spec (`.kiro/specs/core/`) and the dashboard spec (`.kiro/specs/dashboard/`). It adds no scoring logic and changes no `rules.json` band, no Radiation engine rule and no Cutoffs_File value. Code lives in `driftwatch/src/`: pure functions in `engine/`, the Dexie additions in `store/`, the screen in `ui/`, and the form ranges in `data/`. The stack is React, Vite, JavaScript only, Tailwind CSS, Dexie and Vitest. There is no backend and no network at runtime. All text is English. Driftwatch is decision support, not a medical device, and all demo data is simulated and labelled "Simulated".

Assumptions (to be confirmed in the design):

1. **Isolation module.** The Isolation module (`modules/isolation/`) scores `sleep_hours`, `mood`, `reaction_ms` and `social_contact`. The Isolation form writes Readings in the `isolation` Domain for all four (`reaction_ms` only when a Reaction_Check result exists), and the Isolation module turns them into Isolation Alerts.
2. **Sleep is shared with Environment.** The existing Environment `rules.json` defines `sleep_hours` for its infection-like Pattern. When the Isolation form is submitted, the Check_In_Mapper also writes the same sleep value as an `environment` Reading for `sleep_hours`, so that Pattern can use it.
3. **Symptom check code.** The Environment form asks simple questions and derives the `symptom_check` code (0, 1 or 2) defined in the Environment `rules.json`. Code 1 means headache or vision change on 2 or more days. Code 2 means it persists or nausea with fatigue. The derivation (Requirement 2) uses a `headache_logged` Reading (0 or 1) that is stored for history only and is not an indicator in the Rules_File. The 3-day persistence rule is a design value.
4. **Radiation inputs.** The Radiation engine takes `cumulativeDose_mSv`, `premissionDose_mSv`, `protonFlux_pfu` and a `symptoms` list. The check-in asks only the symptom questions and writes each as a `radiation` Reading named `symptom_<key>` with value 0 or 1. Dose and flux Readings (`cumulative_dose_mSv`, `premission_dose_mSv`, `proton_flux_pfu`) come from the shared simulated scenario in `sim/`. A radiation input builder, placed outside `engine/radiation-engine.js`, assembles the engine inputs from the latest Readings. IF a dose or flux Reading is missing, the builder uses 0 for that input.
5. **Day.** A day is the local calendar day of the submit time. The UI layer reads the clock once per submit and passes `now` into the pure functions. Engine functions read no clock.
6. **Streak rule.** A day counts toward the streak when at least one module form was submitted that day. The minimum is a design value of 1, held in a data file, so that a lost sensor or a short shift does not break the streak. The streak stays alive through the current day: the count ends at today when today has a check-in, and ends at yesterday when today has none yet.
7. **Second submit.** A second submit of the same module on the same day replaces the first submit of that module on that day, so the personal baseline never counts one day twice.
8. **Ranges are design values.** Each form field has a plausible-entry range held in `driftwatch/src/data/checkinRanges.json` with the source `"design value"`. These ranges only reject impossible entries. They are not clinical limits and differ from the bands in each `rules.json`.
9. **Not covered by the check-in.** The check-in does not write `cabin_co2_7day_avg_mmHg`, `low_intake_bone_note`, `resting_heart_rate_bpm`, `standing_bp_drop`, or `orthostatic_symptoms`.
10. **Navigation.** The app has a simple view switch between the Dashboard and the Check_In_Screen, with no router. Re-running the engine uses the same data hook that feeds the Dashboard, extended with a refresh call.
11. **Phone width and laptop width.** "Phone width" means 360 CSS pixels and "laptop width" means 1280 CSS pixels, as in the dashboard spec.

## Glossary

- **Check_In_Screen**: The React screen in `driftwatch/src/ui/` that shows the Module_Forms and the Streak_Display.
- **Module_Form**: One short form on the Check_In_Screen for one module: Environment_Form, Radiation_Form, Isolation_Form, Gravity_Form or Nutrition_Form.
- **Check_In_Validator**: The pure function in `engine/` that checks raw form values against the Form_Ranges and returns a list of field errors.
- **Check_In_Mapper**: The pure function in `engine/` that turns valid form values and a submit time into a list of Readings.
- **Check_In_Service**: The code that validates a submit, saves the Readings and the Check_In_Record, and then triggers the Engine_Rerun.
- **Engine_Rerun**: The call of `runModules` with the stored Readings, the Cutoffs_File values and the submit time, followed by an update of the Alerts shown on the Dashboard.
- **Reading**: A record with `timestamp`, `domain`, `indicator` and `value`, as defined by the core spec.
- **Reading_Store**: The Dexie store of Readings defined by the core spec.
- **Alert**: An object with exactly the fields `domain`, `indicator`, `value`, `baseline`, `status`, `urgency`, `why`, `action`, `escalate`, `source`, as defined by the core spec.
- **Form_Ranges**: The data file `driftwatch/src/data/checkinRanges.json` that holds the minimum and maximum accepted value of each numeric form field, each with the source `"design value"`.
- **Field_Error**: A message for one form field that states the problem and the accepted range.
- **Symptom_Check_Code**: The numeric value of the `symptom_check` indicator in the Environment `rules.json`: 0 for none, 1 for headache or vision change on 2 or more days, 2 for a symptom that persists or nausea with fatigue.
- **Radiation_Symptom_Key**: One of `nausea`, `vomiting`, `fatigue`, `skin`, `fever`, `bruising`, the keys of the Radiation engine symptom list.
- **Reaction_Check**: A tap test of about 60 seconds, within a limit of 2 minutes, in which the astronaut taps when a prompt appears. The result is the median reaction time in milliseconds.
- **Median_Reaction**: The median of the recorded reaction times of one Reaction_Check, stored as the `reaction_ms` Reading.
- **Check_In_Record**: A row in the IndexedDB table `checkins` with a `dayKey` (local date as `YYYY-MM-DD`) and a `module` name, saved when a Module_Form is submitted.
- **Day_Key**: The local calendar date of a timestamp, written `YYYY-MM-DD`.
- **Streak**: The number of consecutive days, counted back from the current day, that each have at least one Check_In_Record.
- **Streak_Counter**: The pure function in `engine/` that computes the Streak from a list of Day_Keys and the current Day_Key.
- **Streak_Display**: The part of the Check_In_Screen that shows the Streak and the modules completed today.
- **Disclaimer_Banner**: The permanent banner "Simulated data. Decision support, not a medical device." defined by the dashboard spec.
- **Phone_Width**: A viewport 360 CSS pixels wide.
- **Laptop_Width**: A viewport 1280 CSS pixels wide.

## Requirements

### Requirement 1: Check-in screen with one form per module

**User Story:** As an astronaut, I want one short form for each module on a single check-in screen, so that I can log my day in a few minutes.

#### Acceptance Criteria

1. THE Check_In_Screen SHALL show five Module_Forms, titled "Environment", "Radiation", "Isolation", "Gravity" and "Nutrition", in that order.
2. THE Check_In_Screen SHALL provide a separate submit button for each Module_Form, so that each Module_Form can be submitted on its own.
3. THE Check_In_Screen SHALL show the Disclaimer_Banner with the exact text "Simulated data. Decision support, not a medical device."
4. THE Check_In_Screen SHALL provide a control, with a touch target of at least 44 by 44 CSS pixels, that switches between the Dashboard and the Check_In_Screen.
5. WHEN a Module_Form is submitted successfully, THE Check_In_Screen SHALL show the confirmation text "Saved. Alerts updated." next to that Module_Form and keep the entered values visible.
6. THE Check_In_Screen SHALL write its labels, hints and messages in English and use the word "possible" wherever a message refers to a symptom or a risk.

### Requirement 2: Environment form

**User Story:** As an astronaut, I want to log cabin CO2, a headache answer and my temperature, so that Driftwatch can warn me about possible cabin-air problems.

#### Acceptance Criteria

1. THE Environment_Form SHALL ask for the cabin CO2 1-hour average in mmHg, for whether a headache or vision change occurred today (yes or no), for whether nausea with fatigue occurred today (yes or no), and for body temperature in deg C.
2. WHEN the Environment_Form is submitted with valid values, THE Check_In_Mapper SHALL write the CO2 value as the `environment` Reading `cabin_co2_mmHg` and the temperature as the `environment` Reading `body_temperature`.
3. WHEN the Environment_Form is submitted with valid values, THE Check_In_Mapper SHALL write the headache answer as the `environment` Reading `headache_logged` with value 1 for yes and 0 for no.
4. WHEN the Environment_Form is submitted with valid values, THE Check_In_Mapper SHALL write the `environment` Reading `symptom_check` with the Symptom_Check_Code derived from the form answers and the stored `headache_logged` history.
5. WHEN nausea with fatigue is answered yes, THE Check_In_Mapper SHALL set the Symptom_Check_Code to 2.
6. WHEN headache is answered yes today and `headache_logged` is 1 on each of the 2 preceding days, THE Check_In_Mapper SHALL set the Symptom_Check_Code to 2.
7. WHEN headache is answered yes today and `headache_logged` is 1 on at least 1 of the 2 preceding days and neither rule in criteria 5 and 6 applies, THE Check_In_Mapper SHALL set the Symptom_Check_Code to 1.
8. WHEN neither rule in criteria 5, 6 and 7 applies, THE Check_In_Mapper SHALL set the Symptom_Check_Code to 0.
9. WHEN the headache answer is yes, THE Environment_Form SHALL show the hint "A single day is saved to your history. Possible symptoms raise an alert when they repeat."

### Requirement 3: Radiation form

**User Story:** As an astronaut, I want to tick any symptoms I have today, so that Driftwatch can include them when it judges possible radiation concern.

#### Acceptance Criteria

1. THE Radiation_Form SHALL show one yes or no checkbox for each Radiation_Symptom_Key, labelled "Nausea", "Vomiting", "Unusual fatigue", "Skin redness or irritation", "Fever or chills" and "Easy bruising or bleeding".
2. WHEN the Radiation_Form is submitted, THE Check_In_Mapper SHALL write one `radiation` Reading `symptom_<key>` for every Radiation_Symptom_Key, with value 1 for a ticked checkbox and 0 for an unticked checkbox.
3. WHEN the Radiation_Form is submitted with no checkbox ticked, THE Check_In_Service SHALL accept the submit and record that no symptoms were reported.
4. WHEN the Engine_Rerun runs for the Radiation module, THE radiation input builder SHALL pass to the Radiation engine a `symptoms` list that contains the Radiation_Symptom_Keys whose latest `symptom_<key>` Reading is 1, together with `cumulativeDose_mSv`, `premissionDose_mSv` and `protonFlux_pfu` taken from the latest dose and flux Readings.
5. IF a dose or flux Reading does not exist, THEN THE radiation input builder SHALL use the value 0 for the missing input.
6. THE Radiation_Form SHALL NOT change the Radiation engine scoring, the symptom weights or the 600 mSv and 250 mSv wording.

### Requirement 4: Isolation form

**User Story:** As an astronaut, I want to log my sleep, my mood and a reaction check, so that Driftwatch can see isolation and fatigue drift early.

#### Acceptance Criteria

1. THE Isolation_Form SHALL ask for sleep in hours, for mood and stress as a whole number from 0 to 10 where 0 is "Calm and happy" and 10 is "Very stressed" (the scale the Isolation module defines in its `rules.json`), for social contact in minutes, and offer the Reaction_Check.
2. WHEN the Isolation_Form is submitted with valid values, THE Check_In_Mapper SHALL write the `isolation` Readings `sleep_hours` and `mood`.
3. WHEN the Isolation_Form is submitted with valid values, THE Check_In_Mapper SHALL write the same sleep value as the `environment` Reading `sleep_hours`.
4. WHEN a Reaction_Check result exists in the Isolation_Form, THE Check_In_Mapper SHALL write the Median_Reaction as the `isolation` Reading `reaction_ms`.
5. WHILE no Reaction_Check result exists, THE Isolation_Form SHALL accept a submit and write no `reaction_ms` Reading.
6. THE Isolation_Form SHALL work when no Isolation module code exists, because the Isolation_Form depends only on the Check_In_Validator, the Check_In_Mapper and the Reading_Store.

### Requirement 5: Reaction check

**User Story:** As an astronaut, I want a quick tap test, so that Driftwatch has a simple measure of how alert I am.

#### Acceptance Criteria

1. WHEN the astronaut starts the Reaction_Check, THE Reaction_Check SHALL show a prompt "Tap now" after a random wait of 2 to 6 seconds and record the time in milliseconds from the prompt to the tap.
2. WHEN the astronaut taps before the prompt appears, THE Reaction_Check SHALL discard that tap, show the message "Too early. Wait for the prompt.", and start a new wait.
3. WHEN 60 seconds have passed since the start, THE Reaction_Check SHALL end after the current tap or wait and show the Median_Reaction in milliseconds.
4. THE Reaction_Check SHALL end no later than 2 minutes after the start.
5. IF fewer than 5 reaction times were recorded when the Reaction_Check ends, THEN THE Reaction_Check SHALL show the message "Not enough taps. Please run the reaction check again." and produce no Median_Reaction.
6. THE Reaction_Check SHALL be operable with the Space key and the Enter key on the same focused button as with a tap, and SHALL announce the prompt "Tap now" through a polite live region.
7. THE Reaction_Check SHALL provide a "Skip reaction check" control that leaves the Isolation_Form without a Reaction_Check result.
8. FOR ALL non-empty lists of reaction times, THE Median_Reaction function SHALL return a value between the smallest and the largest time of the list, and the same value for any ordering of the list.

### Requirement 6: Gravity and nutrition forms

**User Story:** As an astronaut, I want to log my exercise and my food intake, so that Driftwatch can see possible bone, muscle and nutrition drift.

#### Acceptance Criteria

1. THE Gravity_Form SHALL ask for the number of exercise sessions completed in the last 7 days, as a whole number.
2. WHEN the Gravity_Form is submitted with a valid value, THE Check_In_Mapper SHALL write the `gravity` Reading `exercise_sessions_per_week`.
3. THE Nutrition_Form SHALL ask for the share of the planned menu eaten today, as a percentage.
4. WHEN the Nutrition_Form is submitted with a valid value, THE Check_In_Mapper SHALL write the `nutrition` Reading `intake_pct_of_plan`.

### Requirement 7: Input validation with ranges and clear messages

**User Story:** As an astronaut, I want a clear message when I mistype a value, so that I can fix it before it is saved.

#### Acceptance Criteria

1. THE Form_Ranges SHALL define a minimum and a maximum for each numeric field, each with the source `"design value"`: CO2 from 0 to 10 mmHg, temperature from 34 to 42 deg C, sleep from 0 to 16 hours, mood and stress from 0 to 10, social contact from 0 to 1440 minutes, exercise sessions from 0 to 21, intake from 0 to 150 percent, and Median_Reaction from 100 to 2000 ms.
2. THE Check_In_Validator SHALL read the ranges from the Form_Ranges and contain no range constant in its function body.
3. IF a required numeric field is empty, THEN THE Check_In_Validator SHALL return a Field_Error with the text "Enter a value for <field name>."
4. IF a numeric field holds text that is not a finite number, THEN THE Check_In_Validator SHALL return a Field_Error with the text "<field name> must be a number."
5. IF a numeric field is outside its range, THEN THE Check_In_Validator SHALL return a Field_Error that names the field and states the accepted range and unit, for example "Sleep must be from 0 to 16 h."
6. IF a field that requires a whole number holds a decimal value, THEN THE Check_In_Validator SHALL return a Field_Error with the text "<field name> must be a whole number."
7. IF any Field_Error exists for a Module_Form, THEN THE Check_In_Service SHALL save no Reading and no Check_In_Record for that Module_Form.
8. IF a yes or no question is unanswered, THEN THE Check_In_Validator SHALL return a Field_Error with the text "Choose yes or no."
9. THE Form_Ranges SHALL differ from the Band limits of the `rules.json` files, and THE Check_In_Validator SHALL show no message that calls an in-range value normal or abnormal.

### Requirement 8: Mapping of form fields to Readings

**User Story:** As a developer, I want a single, tested mapping from form fields to Readings, so that the engine always receives the indicators its rules expect.

#### Acceptance Criteria

1. WHEN the Check_In_Mapper receives valid form values and a submit time, THE Check_In_Mapper SHALL return Readings that each have the fields `timestamp`, `domain`, `indicator` and `value`, with `timestamp` equal to the submit time.
2. THE Check_In_Mapper SHALL use the indicator names `cabin_co2_mmHg`, `body_temperature`, `symptom_check`, `sleep_hours`, `exercise_sessions_per_week` and `intake_pct_of_plan` exactly as they appear in the existing `rules.json` files.
3. THE Check_In_Mapper SHALL return only Readings that the `validateReading` function accepts.
4. THE Check_In_Mapper SHALL return a numeric `value` for every Reading, using 1 for yes and 0 for no.
5. FOR ALL valid form values, saving the mapped Readings and then reading them back from the Reading_Store SHALL return equivalent Readings (round-trip property).

### Requirement 9: Save, re-run the engine and update alerts

**User Story:** As an astronaut, I want my alerts to update as soon as I submit, so that I see the effect of today's entries right away.

#### Acceptance Criteria

1. WHEN a Module_Form is submitted with no Field_Error, THE Check_In_Service SHALL save the mapped Readings through the Reading_Store and save a Check_In_Record for that module and day in one Dexie transaction.
2. WHEN the Readings are saved, THE Check_In_Service SHALL run the Engine_Rerun for all registered Modules using the submit time as `now`.
3. WHEN the Engine_Rerun completes, THE Dashboard SHALL show the updated Alerts without a page reload.
4. WHEN the same module is submitted a second time on the same day, THE Check_In_Service SHALL delete the Readings written by the earlier submit of that module on that day and write the new Readings, so that one day holds one set of Readings per module.
5. WHEN the same module is submitted a second time on the same day, THE Check_In_Service SHALL keep one Check_In_Record for that module and day.
6. IF saving the Readings fails, THEN THE Check_In_Service SHALL show the message "Could not save your check-in. Please try again.", keep the entered values, and write no Check_In_Record.
7. IF the Engine_Rerun reports an error after the Readings are saved, THEN THE Check_In_Service SHALL keep the saved Readings and the Check_In_Record, and show the message "Saved. Alerts could not be updated yet."
8. THE Check_In_Service SHALL make no network request during the save and the Engine_Rerun.

### Requirement 10: Streak counter

**User Story:** As an astronaut, I want a streak that counts the days I complete a check-in, so that I am encouraged to keep the habit.

#### Acceptance Criteria

1. WHEN a Module_Form is submitted successfully, THE Check_In_Service SHALL save a Check_In_Record with the Day_Key of the submit time and the module name in the IndexedDB table `checkins`.
2. THE Streak_Counter SHALL count a day when at least the minimum number of modules from the data file, 1 by default, have a Check_In_Record on that day.
3. WHEN the Streak_Counter receives the Day_Keys and the current Day_Key, THE Streak_Counter SHALL return the number of consecutive counted days that end on the current day, or end on the day before the current day when the current day has no counted check-in.
4. IF a day with no counted check-in lies between two counted days, THEN THE Streak_Counter SHALL end the Streak at the later of those two days.
5. THE Streak_Counter SHALL take only Day_Keys and module names as input, and SHALL NOT take any Reading value, Alert or status.
6. THE Streak_Display SHALL show the text "Check-in streak: <N> days" and the text "Modules checked in today: <M> of 5".
7. WHEN the Streak increases, THE Streak_Display SHALL show the text "Thank you for checking in." and no text that rates the astronaut's health or results.
8. WHEN the current day has no counted check-in and the Streak is 0, THE Streak_Display SHALL show the text "Check-in streak: 0 days. Submit any form to start a streak."
9. WHERE the astronaut reopens the app after a restart, THE Streak_Display SHALL show the Streak computed from the stored Check_In_Records.
10. FOR ALL sets of Day_Keys, THE Streak_Counter SHALL return the same Streak for any ordering of the Day_Keys and for any number of duplicates of a Day_Key (order-independence and idempotence properties).
11. FOR ALL sets of Day_Keys, adding a Day_Key that lies at least 2 days before the first day of the current run SHALL leave the Streak unchanged, and adding the current Day_Key when it is missing SHALL increase the Streak by exactly 1 (metamorphic properties).
12. FOR ALL Alerts and Reading values, THE Streak SHALL be identical, because the Streak depends on no Alert status and no Reading value (invariant property).

### Requirement 11: Accessible forms

**User Story:** As an astronaut who uses a keyboard or a screen reader, I want labelled fields and clear errors, so that I can complete the check-in without a pointer.

#### Acceptance Criteria

1. THE Check_In_Screen SHALL give every input a visible text label associated with the input.
2. THE Check_In_Screen SHALL group each set of related yes or no choices, mood choices and symptom checkboxes in a `fieldset` with a `legend`.
3. WHEN a Field_Error exists for a field, THE Check_In_Screen SHALL show the message next to the field, set `aria-invalid="true"` on the field and associate the message with the field through `aria-describedby`.
4. WHEN a submit fails validation, THE Check_In_Screen SHALL move keyboard focus to the first field that has a Field_Error.
5. THE Check_In_Screen SHALL allow every control, including the submit buttons, the mood choices and the Reaction_Check button, to be reached and operated with the keyboard alone.
6. THE Check_In_Screen SHALL announce the confirmation and error messages of a submit through a polite live region.
7. THE Check_In_Screen SHALL render text with a contrast ratio of at least 4.5:1 and show every status or error with text, not with colour alone.

### Requirement 12: Responsive layout, offline operation and wording

**User Story:** As an astronaut, I want the check-in to work on a phone and a laptop with no network, so that I can complete it wherever I am.

#### Acceptance Criteria

1. WHILE the viewport is Phone_Width, THE Check_In_Screen SHALL arrange the Module_Forms in a single column with no horizontal scrolling of the page.
2. WHILE the viewport is Laptop_Width, THE Check_In_Screen SHALL arrange the Module_Forms in no more than two columns.
3. THE Check_In_Screen SHALL give every interactive control a touch target of at least 44 by 44 CSS pixels and set body text to at least 16 CSS pixels at Phone_Width.
4. WHILE Offline, THE Check_In_Screen SHALL accept, validate and save a submit and update the Alerts using only data stored on the device.
5. THE Check_In_Screen SHALL make no network request, including no remote font, image, script or style.
6. THE Check_In_Screen SHALL show the label "Simulated" on every Streak_Display, Alert summary and history value that comes from demo data.
7. THE Check_In_Screen SHALL write no diagnostic wording of its own, and SHALL describe the 250 mSv value only through the wording defined by the dashboard spec.

### Requirement 13: Tests and structure

**User Story:** As a developer, I want the check-in logic in pure, tested functions, so that it is easy to verify and reuse.

#### Acceptance Criteria

1. THE Check_In_Validator, the Check_In_Mapper, the Streak_Counter, the Median_Reaction function and the Symptom_Check_Code derivation SHALL be pure functions in `driftwatch/src/engine/` with no import from `ui/`, React or Dexie.
2. THE check-in test suite SHALL include at least one Vitest unit test for every function exported from the new `engine/` files.
3. THE check-in test suite SHALL include property-based tests for the Streak_Counter properties of Requirement 10, the Median_Reaction property of Requirement 5, and the property that every Reading returned by the Check_In_Mapper passes `validateReading`.
4. THE check-in test suite SHALL include example tests for each Symptom_Check_Code rule of Requirement 2, each Field_Error of Requirement 7, and each range in the Form_Ranges at its minimum, its maximum and just outside both.
5. THE check-in test suite SHALL include store tests, using an in-memory IndexedDB substitute, that show a second submit of one module on one day leaves one set of Readings and one Check_In_Record.
6. THE check-in test suite SHALL include an integration test in which a submit of a CO2 value above the `act` Band edge changes the `environment_overall` Alert, and in which the Streak is the same before and after that Alert status change.
7. THE check-in test suite SHALL include component tests (jsdom) that check the label of each input, the `aria-describedby` link of an error, focus on the first invalid field, and keyboard submit of one Module_Form.
8. WHEN `vitest --run` is executed in `driftwatch/`, THE check-in test suite SHALL complete with zero failing tests.
