export function isOpenClockRecord(record) {
  return !!record?.punch_in_time && !record?.punch_out_time && !record?.manually_closed;
}

export function getPunchInTime(record) {
  return record?.punch_in_time || null;
}

export function getPunchOutTime(record) {
  return record?.punch_out_time || null;
}
