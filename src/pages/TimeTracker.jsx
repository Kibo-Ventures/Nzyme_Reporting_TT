import { useState } from 'react'
import WeeklyForm from '../components/timetracker/WeeklyForm'
import SuccessScreen from '../components/timetracker/SuccessScreen'
import { getMondayISO } from '../hooks/useTimeEntries'
import { useAuth } from '../contexts/AuthContext'

export default function TimeTracker() {
  const { user } = useAuth()
  const [submitted, setSubmitted] = useState(false)

  function handleReset() {
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <SuccessScreen
        userName={user?.email}
        weekStart={getMondayISO()}
        onReset={handleReset}
      />
    )
  }

  return (
    <WeeklyForm
      userEmail={user?.email}
      onSubmitted={() => setSubmitted(true)}
    />
  )
}
