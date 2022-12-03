const service = require("./reservations.service");
const asyncErrorBoundary = require("../errors/asyncErrorBoundary");

// ----------------------------------------------------------------- Status Validation

const acceptedStatus = [
  "finished",
  "booked",
  "seated",
  "cancelled"
]

function validateStatus(req,res, next){
  const status = req.body.data.status;
  const foundReservation = res.locals.foundReservation;

  if(!acceptedStatus.includes(status)){ // Is an accepted status
    return next({
      status: 400,
      message: `Status '${status}' is not a valid status type.`,
    })
  }

  if(foundReservation.status === "finished"){ // Is finished. Finished status cannot be edited.
    return next({
      status: 400,
      message: `Reservation ${foundReservation.reservation_id} is finished.`,
    })
  }

  res.locals.newStatus = status;
  next();
}

// ----------------------------------------------------------------- Id Validation

async function validateId(req,res,next){ 
  const reservationId = req.params.reservationId;
  const foundReservation = await service.read(reservationId);

  if(!foundReservation){
    return next({
      status: 404,
      message: `Reservation ${reservationId} not found.`,
    })
  }
  
  res.locals.foundReservation = foundReservation;
  res.locals.reservationId = reservationId;
  next();
}

// ----------------------------------------------------------------- Time Validation

function currentDate() { // returns the current date in an array [00,00,00]
  const date = new Date();
  return [date.getFullYear(),
  (date.getMonth() + 1),
  date.getDate(),]
}

function currentTime() {
  const time = new Date();
  return [time.getHours(),
  time.getMinutes()]
}

function validateTime(req,res,next){
  const resTime = res.locals.data.reservation_time;
  const resDate = res.locals.data.reservation_date
  const todaysDate = currentDate();
  
  const theirTime = resTime.split(":").map((value)=>value = parseInt(value));
  const theirDate = resDate.split("-").map((value)=>value = parseInt(value));

  const myTime = currentTime()

  const pastErr = {
    status: 400,
    message: `The reservation date is in the past. Only future reservations are allowed.`,
  }

  if(theirTime[0] <= 10){
    if(theirTime[0] === 10 && theirTime[1] < 30){
      return next({
        status: 400,
        message: `No reservations can be made before we open at 10:30AM.`,
      })
    } else if (theirTime[0] < 10){
      return next({
        status: 400,
        message: `No reservations can be made before we open at 10:30AM.`,
      })
    }
  }

  if(theirTime[0] > 21){
    return next({
      status: 400,
      message: `No reservations can be made after 9:30PM.`,
    })
  } else if(theirTime[0] == 21 && theirTime[1] >= 30){
    return next({
      status: 400,
      message: `No reservations can be made after 9:30PM.`,
    })
}

  if(theirDate[0] === todaysDate[0] && theirDate[1] === todaysDate[1] && theirDate[2] === todaysDate[2] ){
    if(theirTime[0] < myTime[0]) return next(pastErr)
    if(theirTime[0] === myTime[0] && theirTime[1] < myTime[1]) return next(pastErr)
  }

  next();
}

// ----------------------------------------------------------------- Date Validation

function aDate(year,month,day){ // returns the value of the day integer value 0-6 of the week of an entered date
  const myDate = new Date();
  myDate.setFullYear(year);
  myDate.setMonth(month - 1);
  myDate.setDate(day);
  return myDate.getDay();
}

function validateDate(req, res, next){ // validates the date is in the future and not a tuesday
  const resDate = res.locals.data.reservation_date

  const theirDate = resDate.split("-").map((value)=>value = parseInt(value));
  const myDate = currentDate();

  const pastErr = {
    status: 400,
    message: `The reservation date is in the past. Only future reservations are allowed.`,
  };

  if(theirDate[0] < myDate[0]){ return next(pastErr) };
  if(theirDate[0] === myDate[0] && theirDate[1] < myDate[1]){ return next(pastErr) };
  if(theirDate[0] === myDate[0] && theirDate[1] === myDate[1] && theirDate[2] < myDate[2]){ return next(pastErr) };

  if(aDate(theirDate[0],theirDate[1],theirDate[2]) == 2){ return next({
      status: 400,
      message: `The reservation date is a Tuesday as the restaurant is closed on Tuesdays.`,
    })
  };

  next();
}

// ----------------------------------------------------------------- Field Validation

const requiredFields = [
  "first_name",
  "last_name",
  "mobile_number",
  "reservation_date",
  "reservation_time",
  "people",
];

function validateFields(req, res, next) {
  const data = req.body.data;

  if(!data){
    return next({
      status: 400,
      message: `No data received.`,
    });
  }

  if (data["reservation_date"] && !data["reservation_date"].match(/\d{4}-\d{2}-\d{2}/g)) {
    return next({
      status: 400,
      message: `reservation_date does not match the pattern`,
    });
  }
  if (
    data["reservation_time"] &&
    !data["reservation_time"].match(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/)
  ) {
    return next({
      status: 400,
      message: `reservation_time does not match pattern`,
    });
  }
  if (data["people"] && typeof data["people"] !== "number") {
    return next({
      status: 400,
      message: `people is not a number`,
    });
  }

  requiredFields.map((field) => {
    if (!data[field]) {
      return next({
        status: 400,
        message: `Required field: ${field} is missing`,
      });
    }
  });

  // Status can only be booked for post
  if(data.status === "seated" || data.status === "finished"){
    return next({
      status: 400,
      message: `A reservation status must be 'booked' before being '${data.status}'`,
    });
  }
  res.locals.data = data;
  next();
}

// ----------------------------------------------------------------- Functionality

async function create(req, res, next) {
  const newReservation = res.locals.data;
  const data = await service.create(newReservation);
  res.status(201).json({ data });
}

async function list(req, res) {
  const date = req.query.date;
  const mobileNumber = req.query.mobile_number;
  let data = {};

  if (date) {
    data = await service.listSpecificDate(date);
    return res.json({ data });
  }

  if (mobileNumber){
    data = await service.search(mobileNumber);
    return res.json({ data });
  }

  data = await service.list();
  return res.json({ data });
}

async function read(req,res){
  const params = res.locals.reservationId;
  const data = await service.read(params);
  return res.json({ data });
}

async function statusChange(req,res){
  const reservationId = res.locals.reservationId
  const newStatus = res.locals.newStatus
  await service.updateStatus(reservationId, newStatus)
  return res.status(200).json({ data: { status: newStatus } });
}

async function update(req,res){
  const reservationId = res.locals.reservationId;
  const updatedReservation = res.locals.data;
  const data = await service.update(reservationId, updatedReservation);
  return res.status(200).json({ data });
}

module.exports = {
  create: [validateFields, validateDate, validateTime, asyncErrorBoundary(create)],
  list: [asyncErrorBoundary(list)],
  read: [asyncErrorBoundary(validateId), asyncErrorBoundary(read)],
  updateStatus: [asyncErrorBoundary(validateId), validateStatus, asyncErrorBoundary(statusChange)],
  update: [asyncErrorBoundary(validateId), validateFields, validateDate, validateTime, asyncErrorBoundary(update)]
};