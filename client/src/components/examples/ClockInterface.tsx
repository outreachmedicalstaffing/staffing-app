import { ClockInterface } from '../clock-interface'

export default function ClockInterfaceExample() {
  return (
    <div className="max-w-md p-6">
      <ClockInterface 
        userName="John Doe"
        currentJob="Central Florida"
        currentSubJob="7P-7A"
      />
    </div>
  )
}
