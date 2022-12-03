const service = require("./tables.service");
const asyncErrorBoundary = require("../errors/asyncErrorBoundary");
const { updateStatus } = require("../reservations/reservations.service");

// ----------------------------------------------------------------- ID Validation

//Table tableId exists
async function validateId(req,res,next){
  const tableId = req.params.tableId
  const foundTable = await service.readTable(tableId);
  if(!foundTable){
    return next({
      status: 404,
      message: `Table ${tableId} not found.`,
    })
  }
  res.locals.tableId = tableId;
  res.locals.foundTable = foundTable;
  next();
}

// ----------------------------------------------------------------- Status Validation

async function isNotSeated(req,res,next){
  const foundTable = res.locals.foundTable;
  const body = res.locals.data;
  const foundReservation = res.locals.foundReservation;

  if(foundReservation.status === "seated"){
    return next({
      status: 400,
      message: `Reservation ${foundReservation.reservation_id} is already seated.`,
    })
  }
  next();
}

// ----------------------------------------------------------------- Capacity Validation

async function validateCapacity(req, res, next){
  const tableId = req.params.tableId
  const body = res.locals.data;
  const foundReservation = await service.readReservation(body.reservation_id);
  const foundTable = await service.readTable(tableId);

  if(!foundReservation){ // If the reservation exists
    return next({
      status: 404,
      message: `Reservation ${body.reservation_id} does not exist.`,
    })
  }

  if(foundTable.reservation_id !== null){ // If the table is occupied
    return next({
      status: 400,
      message: `Table is occupied.`,
    })
  }

  if(foundReservation.people > foundTable.capacity){ // If the table can fit the party size
    return next({
      status: 400,
      message: `Party size is over table capacity.`,
    })
  }
  res.locals.tableId = tableId;
  res.locals.foundTable = foundTable;
  res.locals.foundReservation = foundReservation;
  next();
}

async function isOccupied(req,res,next){ // If the table is Empty
  const tableId = res.locals.tableId;
  const foundTable = res.locals.foundTable;
  if(!foundTable.reservation_id){
    return next({
      status: 400,
      message: `Table ${tableId} is not occupied.`,
    })
  }
  next();
}

// ----------------------------------------------------------------- Field Validation

const requiredFieldsSeat = [
  "reservation_id",
];

const requiredFieldsTable = [
  "table_name",
  "capacity",
];

function validateFields(fields) {
  return (req, res, next) => {
    const data = req.body.data;

    if (!data) {
      return next({
        status: 400,
        message: `Missing data.`,
      });
    }

    fields.map((field) => {
      if (!data[field]) {
        return next({
          status: 400,
          message: `Required field: ${field} is missing`,
        });
      }
    });
    res.locals.data = data;
    next();
  };
}

function validateFieldLengths(req,res,next){
  const data = res.locals.data;

  if(typeof data.capacity !== "number"){
    return next({
      status: 400,
      message: `Given capacity is not a number.`,
    });
  }
  if(data.table_name.length < 2){ 
    return next({
      status: 400,
      message: `Field table_name is too short.`,
    });
  }
  next();
}

// ----------------------------------------------------------------- Functionality

async function create(req,res){
  const newTable = res.locals.data;
  const data = await service.create(newTable)

  return res.status(201).json({ data });
}

async function list(req, res) {
  const params = req.query.date;
  let data = {};

  if (params) {
    data = await service.listSpecific(params);
    return res.json({ data });
  }

  data = await service.list();
  return res.json({ data });
}

async function updateSeat(req, res) {
  const body = res.locals.data;
  const tableId = res.locals.tableId;
  const data = await service.seat(tableId,body.reservation_id);
  await updateStatus(body.reservation_id, "seated")
  return res.status(200).json({ data });
}

async function unSeat(req, res){
  const tableId = res.locals.tableId;
  const foundTable = res.locals.foundTable;
  await updateStatus(foundTable.reservation_id, "finished")
  await service.seat(tableId);
  return res.status(200).json({});
}

module.exports = {
  list: [asyncErrorBoundary(list)],
  update: [validateFields(requiredFieldsSeat), validateCapacity, isNotSeated, asyncErrorBoundary(updateSeat)],
  create: [validateFields(requiredFieldsTable), validateFieldLengths, asyncErrorBoundary(create)],
  unSeat: [validateId, isOccupied, asyncErrorBoundary(unSeat)],
}