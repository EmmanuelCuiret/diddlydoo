import { Router } from 'express'

import { createEventSchema, patchEventSchema, addDateSchema } from '../schemas/events.mjs'
import { getDB, initEvent, patchEvent, stripTime, remapData } from '../helpers/functions.mjs'
import * as mw from '../helpers/middlewares.mjs'

const router = Router()

/**
 * DELETE /api/events/:eventId/:date
 *
 * Cette route supprime une date de l'événement spécifié ainsi que de tous
 * les tableaux de dates des participants.
 */
router.route('/events/delete/:_id/:date')
  .delete(mw.idSpecific, mw.getElem, async (req, res, next) => {
    try {
      const { _id, date } = req.params;
      //console.log("🔹 Suppression de la date:", date, "pour l'événement:", _id);

      const db = await getDB();

      // Trouver l'événement
      const eventIndex = db.data.findIndex(event => event.id === _id);
      if (eventIndex === -1) {
        //console.error("❌ Événement non trouvé !");
        return res.status(404).send({ error: "Événement non trouvé" });
      }

      //console.log("✅ Événement trouvé :", db.data[eventIndex]);

      // Supprimer la date de l'événement
      db.data[eventIndex].dates = db.data[eventIndex].dates.filter(d => d !== date);
      //console.log("✅ Dates après suppression :", db.data[eventIndex].dates);

      // Supprimer la date pour chaque participant
      if (db.data[eventIndex].attendees && Array.isArray(db.data[eventIndex].attendees)) {
        db.data[eventIndex].attendees.forEach(attendee => {
          attendee.dates = attendee.dates.filter(d => d.date !== date);
        });
        //console.log("✅ Participants mis à jour :", db.data[eventIndex].attendees);
      } else {
        //console.log("ℹ️ Aucun participant à mettre à jour.");
      }

      await db.write();
      //console.log("✅ Base de données mise à jour !");
      return res.send({ message: 'Date supprimée avec succès' });

    } catch (error) {
      //console.error("❌ Erreur lors de la suppression de la date :", error);
      return res.status(500).send({ error: "Erreur serveur" });
    }
  });



router.route('/events/:_id?')
  .get(async (req, res, next) => {
    const db = await getDB()
    const { _id } = req.params
    const data = db.data || []
    const dataMapped = data.map(remapData)

    if (_id === undefined)
      return res.send(dataMapped)

    return res.send(dataMapped.find(x => x.id === _id))
  })
  .post(mw.validation(createEventSchema), async (req, res, next) => {
    const db = await getDB()
    const newEvent = await initEvent(req.body.name, req.body.author, req.body.description, req.body.dates)

    db.data.unshift(newEvent)
    await db.write()

    return res.send(newEvent)
  })
  .patch(mw.noBody, mw.idSpecific, mw.validation(patchEventSchema), mw.getElem, async (req, res, next) => {
    const db = await getDB()
    const elem = { ...db.data[req._elem] }

    const newEvent = patchEvent(elem, req.body)
    db.data[req._elem] = newEvent
    await db.write()

    return res.send(remapData(newEvent))
  })
  .delete(mw.idSpecific, mw.getElem, async (req, res, next) => {
    const db = await getDB()
    db.data = db.data.filter(el => el.id !== req.params._id)
    await db.write()

    return res.send({ message: 'Delete sucessful' })
  })

router.post('/events/:_id/add_dates', mw.noBody, mw.idSpecific, mw.validation(addDateSchema), mw.getElem, async (req, res, next) => {
  const db = await getDB();
  const existingDates = db.data[req._elem].dates;

  // Vérifier si une des dates existe déjà
  if (req.body.dates.some(date => existingDates.includes(stripTime(date)))) {
    return res.status(400).send({ error: "One or more dates already exist." });
  }

  // Ajouter les nouvelles dates
  db.data[req._elem].dates.push(...req.body.dates.map(stripTime));

  await db.write();
  return res.send(remapData(db.data[req._elem]));
});

export default router
