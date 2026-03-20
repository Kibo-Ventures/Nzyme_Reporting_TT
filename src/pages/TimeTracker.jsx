import { useState } from 'react'
import WeeklyForm from '../components/timetracker/WeeklyForm'
import SuccessScreen from '../components/timetracker/SuccessScreen'
import { getMondayISO } from '../hooks/useTimeEntries'

export default function TimeTracker() {
  const [selectedUser, setSelectedUser] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleReset() {
    setSelectedUser('')
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <SuccessScreen
        userName={selectedUser}
        weekStart={getMondayISO()}
        onReset={handleReset}
      />
    )
  }

  return (
    <WeeklyForm
      selectedUser={selectedUser}
      onUserChange={setSelectedUser}
      onSubmitted={() => setSubmitted(true)}
    />
  )
}
