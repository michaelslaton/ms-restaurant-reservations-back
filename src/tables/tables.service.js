const knex = require("../db/connection");
const updateStatus = require("../reservations/reservations.service")

const dataBase = "tables";

function create(newTable) {
  return knex(dataBase)
    .insert(newTable)
    .returning("*")
    .then((table) => table[0]);
}

function readReservation(reservation_id){ 
  return knex("reservations")
  .select("*")
  .where({ reservation_id })
  .first();
}

function readTable(table_id){
  return knex(dataBase)
  .select("*")
  .where({ table_id })
  .first();
}

function list(){
  return knex(dataBase)
  .orderBy("table_name")
}

function listSpecific(reservation_date){
  return knex(dataBase)
  .select("*")
  .orderBy("table_name")
}

function seat(table_id,reservation_id){
  if(reservation_id){
    return knex(dataBase)
    .where({ table_id })
    .update({ reservation_id });

  } else {
    return knex(dataBase)
    .where({ table_id })
    .update({ reservation_id: null  });

  }
}

module.exports = {
  create,
  readReservation,
  readTable,
  list,
  listSpecific,
  seat,
}