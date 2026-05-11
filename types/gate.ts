/** Assigned event row from GET /merchant-events/my-assigned-events */
export interface MyAssignedEventItem {
  id: string
  title: string
  eventCode: string
  startsAt: string
  endsAt: string | null
  status: string
  merchantId: string
}

export interface MyAssignedEventsResponse {
  events: MyAssignedEventItem[]
  totalEvents: number
}

export interface CheckInAttendee {
  id: string
  ticketCode: string
  attendeeName: string
  attendeePhone?: string | null
  attendeeEmail?: string | null
  tierName: string
  status: string
  checkedInAt: string | null
  checkedInBy?: string | null
  orderReference: string
}

export interface CheckInApiSuccessBody {
  success: true
  attendee: CheckInAttendee
  message?: string
  warning?: string
}

export type CheckInErrorCode =
  | 'TICKET_NOT_FOUND'
  | 'ALREADY_CHECKED_IN'
  | 'WRONG_EVENT'
  | 'TICKET_CANCELLED'
  | 'EVENT_NOT_TODAY'
  | 'TICKET_INACTIVE'
  | 'CHECK_IN_WINDOW'
  | string

export interface CheckInApiErrorBody {
  success: false
  errorCode?: CheckInErrorCode
  message?: string
  checkedInAt?: string
  attendeeName?: string
  eventTitle?: string
}

/** Event staff roster item from GET /merchant-events/:id/staff */
export interface EventStaffMember {
  id: string
  userId: string
  email: string
  firstName: string
  lastName: string
  ticketsCheckedIn: number
  lastCheckInAt: string | null
  assignedAt: string
}

export interface EventStaffResponse {
  staff: EventStaffMember[]
  totalStaff: number
  activeStaff: number
}

export interface AssignEventStaffResponse {
  success: boolean
  message?: string
}
