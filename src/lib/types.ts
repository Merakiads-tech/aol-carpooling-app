export type Gender = "male" | "female" | "other";
export type UserRole = "teacher" | "volunteer" | "none";
export type RideDirection = "to_event" | "from_event";
export type RideStatus = "active" | "full" | "cancelled";
export type RequestStatus = "pending" | "approved" | "declined" | "cancelled";

export type EventLocation = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  maps_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type DriverSummary = {
  id: string;
  name: string | null;
  photo_url: string | null;
  role: UserRole;
  gender: Gender | null;
};

/** A ride card as returned by get_ride_feed / get_ride_detail. */
export type RideCard = {
  id: string;
  direction: RideDirection;
  depart_date: string;
  depart_time: string;
  pickup_label: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  seats_total: number;
  seats_filled: number;
  status: RideStatus;
  is_full: boolean;
  is_mine?: boolean;
  show_phone_public: boolean;
  event_location: { id: string; name: string; maps_url?: string | null };
  driver: DriverSummary;
  driver_phone: string | null;
  my_request_status: RequestStatus | null;
};

export type OfferedRequest = {
  id: string;
  status: RequestStatus;
  seats: number;
  created_at: string;
  rider: DriverSummary;
  rider_phone: string | null;
};

export type OfferedRide = {
  id: string;
  direction: RideDirection;
  depart_date: string;
  depart_time: string;
  pickup_label: string;
  seats_total: number;
  seats_filled: number;
  status: RideStatus;
  show_phone_public: boolean;
  event_location: { id: string; name: string };
  requests: OfferedRequest[];
};

export type MyRequest = {
  request_id: string;
  status: RequestStatus;
  seats: number;
  depart_date: string;
  depart_time: string;
  direction: RideDirection;
  pickup_label: string;
  seats_total: number;
  seats_filled: number;
  event_location: { id: string; name: string };
  driver: DriverSummary;
  driver_phone: string | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  photo_url: string | null;
  phone: string | null;
  gender: Gender | null;
  role: UserRole;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
};
