const knex = require("../db/connection");

const database = "reservations";

function create(reservation) {
  return knex(database)
    .insert(reservation)
    .returning("*")
    .then((data) => data[0]);
}

function listSpecificDate(reservation_date){
  return knex(database)
  .select("*")
  .where({ reservation_date })
  .whereNotIn("status", ["finished", "cancelled"])
  .orderBy("reservation_time")
}

function list(){
  return knex(database)
  .select("*")
  .whereNotIn("status", ["finished", "cancelled"])
  .orderBy("reservation_time")
}

function read(reservation_id){ 
  return knex(database)
  .select("*")
  .where({ reservation_id })
  .first();
}

function search(mobile_number) {
  return knex(database)
    .whereRaw(
      "translate(mobile_number, '() -', '') like ?",
      `%${mobile_number.replace(/\D/g, "")}%`
    )
    .orderBy("reservation_date");
}

function updateStatus(reservation_id, status){
  return knex(database)
    .where({ reservation_id })
    .update({ status })
}


function update(reservation_id, updatedReservation){
  return knex(database)
    .where({ reservation_id })
    .update(updatedReservation)
    .returning("*")
    .then((data)=> data[0])
}

module.exports = {
  create,
  listSpecificDate,
  list,
  read,
  updateStatus,
  search,
  update,
}