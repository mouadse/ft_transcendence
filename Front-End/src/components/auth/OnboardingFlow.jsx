import { useState } from 'react';
import OnboardingBasicInfo     from './OnboardingBasicInfo';
import OnboardingGoalsActivity from './OnboardingGoalsActivity';
import OnboardingYourPlan      from './OnboardingYourPlan';
import { computeTDEE } from '../../utils/onboarding';

const STEP = { BASIC: 1, GOALS: 2, PLAN: 3 };

export default function OnboardingFlow() {
  const [step, setStep] = useState(STEP.BASIC);

  // Accumulated onboarding data across steps
  const [basicData, setBasicData]  = useState(null); // { age, height, weight, gender }
  const [goalsData, setGoalsData]  = useState(null); // { goal, activityLevel }

  function handleBasicNext(data) {
    setBasicData(data);
    setStep(STEP.GOALS);
  }

  function handleGoalsNext(data) {
    setGoalsData(data);
    setStep(STEP.PLAN);
  }

  // Compute TDEE when entering plan step
  const tdeeData = (basicData && goalsData)
    ? computeTDEE({
        age:           basicData.age,
        height:        basicData.height,
        weight:        basicData.weight,
        gender:        basicData.gender,
        activityLevel: goalsData.activityLevel,
        goal:          goalsData.goal,
      })
    : null;

  if (step === STEP.GOALS) {
    return (
      <OnboardingGoalsActivity
        step={2} totalSteps={3}
        onNext={handleGoalsNext}
        onBack={() => setStep(STEP.BASIC)}
      />
    );
  }
  if (step === STEP.PLAN) {
    return (
      <OnboardingYourPlan
        step={3} totalSteps={3}
        tdeeData={tdeeData}
        goalsData={goalsData}
        onBack={() => setStep(STEP.GOALS)}
      />
      // OnboardingYourPlan calls completeOnboarding() internally,
      // which sets onboarded:true → OnboardingRoute guard auto-redirects to /dashboard
    );
  }
  // default: STEP.BASIC
  return (
    <OnboardingBasicInfo
      step={1} totalSteps={3}
      onNext={handleBasicNext}
      onBack={() => {}}
    />
  );
}
