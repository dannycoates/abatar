abatar A/B testing framework
============================

A workflow for testing and releasing application features.

# Example

I've got a web app that I'd like to do some A/B testing on.

**App**

In the app js that runs in the browser I do something like this:

```js
// Initialize an AB instance with some session data
var ab = AB.create({
  niceCaptchaEnabled: false //default value
})
ab.subject.sessionId = session.id

//...

if (ab.choose('niceCaptchaEnabled')) {
  ui.showCaptcha()
}

//...
// At some point send a report of ab activity to an be analyzed.
// The details of which are beyond the scope of this library.
analyser.send(otherMetrics, ab.report())
```

**Experiment**

On the server I deploy a new experiment that looks like this:

```js
{
  name: 'captcha',
  hypothesis: 'a niceCaptcha does not negatively affect signups',
  startDate: '2014-12-15',
  subjectAttributes: ['sessionId'],
  independentVariables: ['niceCaptchaEnabled'],
  eligibilityFunction: function (subject) {
    // a random sampling of 10% of sessions will be in the experiment
    return this.bernoulliTrial(0.1, subject.sessionId)
  },
  groupingFunction: function (subject) {
    // 50% of participants will see a niceCaptcha the rest are the control group
    return {
      niceCaptchaEnabled: this.bernoulliTrial(0.5, subject.sessionId)
    }
  }
}
```

`niceCaptchaEnabled` is the variable that the app uses to determine whether
to display the captcha. Before the experiment goes live it will use the
default value, false. Once the experiment is live, it will use the `sessionId`
set by the app to determine whether it is eligible with the `eligibilityFunction`;
if not it will get the default, otherwise it gets enrolled in the experiment and
the  `groupingFunction` determines the value. In this example 5% of sessions
will have `niceCaptchaEnabled` set to true.

The analysis to test the hypothesis is beyond the scope of this library at
this time but a simple report of experiments can be created with `ab.report()`
and sent to an existing logging system.

See the "Lifecycle" section for details on how experiments are concluded.

For more examples see `doc/cookbook.md`

# Format

Experiments are defined with javascript objects. Since experimentation is a
process, not just a static declaration, the experiment will change properties
over time through its lifecycle. Not all experiments include all of these
properties and an individual experiment will add properties over time.

## Properties

***name***

    A short unique string for identifing the experiment.

***hypothesis***

    A text description of the experiment.

***startDate***

    The date when the experiment starts. (ISO 8601 format)

***endDate***

    The date when the experiment ends. (ISO 8601 format)

***subjectAttributes***

    The variables provided by the application to the experiment.
    These are typically used by experiments to determine eligibility
    and which experimental group the subject should be in.

***independentVariables***

    The variables provided by the experiment to the application.
    These are the variables the application needs for its configuration.

***eligibilityFunction***

    A javascript function that may use `subjectAttributes` to determine
    if the subject is eligible for the experiment.

***groupingFunction***

    A javascript function that returns values for the `independentVariables`
    based on the `subjectAttributes`.

***conclusion***

    The final values for `independentVariables` after the experiment
    is complete.

***release***

    The dates and strategy for releasing the `conclusion` to all clients.


# Lifecycle

## Phases

1. *New*
2. *Live*
3. *Concluded*
4. *Releasing*
5. *Complete*

## New

An experiment whose `startDate` is in the future is new. Unsurprisingly, it will
not do anything or affect other experiments, but is useful for iterating on the
details before unleashing it on the world. It is the starting state of all
experiments.

## Live

An experiment can transition to live when time catches up to the `startDate`.

## Concluded

An experiment is concluded when analysis has determined a `conclusion`. An
experiment with no conclusion but with an `endDate` skips directly to complete
and is considered aborted.

The conclusion is not automatically released. If an `endDate` is set, the
conclusion will be released all at once on that date and become complete. If a
`release` is set the experiment will transition to releasing.

If neither `endDate` nor `release` are set the experiment will continue running
as if no conclusion has been reached. This may be useful when analysis has
determined a conclusion but the descision about how to release it has not yet
been made.

## Releasing

An experiment that has reached a conclusion and is in the process of
releasing it to all subjects whether they were part of the experiment during
the live phase or not.

## Complete

The experiment is complete and the `conclusion` can be made the default value
in the application.
