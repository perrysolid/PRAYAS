/** Photographs shown on the offices page, saved in /public/img/offices/<id>.jpg, with where each came from. */
export type OfficePhoto = { credit: string; licence: string; source: string };

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const p = (credit: string, licence: string, file: string): OfficePhoto => ({ credit: `${credit}, ${licence}`, licence, source: commons(file) });

const gov = (name: string, source: string): OfficePhoto => ({ credit: `${name} website`, licence: "Official government website", source });

/**
 * Most from Wikimedia Commons under free licences. Where no photograph of the building itself was available,
 * the card shows a photograph of the place or kind of work, and the credit line says whose it is.
 */
export const officePhotos: Record<string, OfficePhoto> = {
  secretariat: gov("Uttarakhand Secretariat Administration Dept", "https://sad.uk.gov.in/profile-uttarakhand-secretariat/"),
  "cm-helpline-1905": gov("Uttarakhand Secretariat Administration Dept", "https://sad.uk.gov.in/"),
  "cm-office": gov("Uttarakhand Secretariat Administration Dept", "https://sad.uk.gov.in/profile-uttarakhand-secretariat/"),
  itda: gov("SIIDCUL, IT Park Dehradun", "https://siidcul.com/IIE-IT-Park-Dehradun"),
  "jal-sansthan": gov("Uttarakhand Jal Sansthan", "https://ujs.uk.gov.in/"),
  "peyjal-nigam": gov("Uttarakhand Peyjal Nigam", "https://peyjal.uk.gov.in/"),
  health: p("Harshit Tewari", "CC BY-SA 4.0", "GDMC_Building.jpg"),

  "raj-bhawan": p("Ramchandra9", "CC BY 3.0", "Lok_Bhavan_Dehradun_Uttarakhand.jpg"),
  ujvnl: p("Sachinbauriyan", "CC BY-SA 4.0", "Maneri_Bhali_dam.jpg"),
  pwd: p("ArmouredCyborg", "CC BY-SA 4.0", "Gaula_Bridge,_Haldwani_Bypass.jpg"),
  "social-welfare": p("jburke601", "CC BY 2.0", "Haldwani_(1).jpg"),
  "school-education": p("itznaval", "CC BY-SA 3.0", "Rajiv_Gandhi_Navodaya_Vidyalaya_-_panoramio.jpg"),
  "police-hq": p("Pulakit Singh", "CC BY-SA 4.0", "Uttarakhand_and_Dehradun_Police.jpg"),
  "urban-development": p("Tanya Singh", "CC BY-SA 4.0", "Nagar_Nigam_Dehradun.jpg"),
  forest: p("Torarne", "CC BY-SA 4.0", "Forest_Research_Institute_campus,_Dehradun,_India.jpg"),
  agriculture: p("Sridhar Rao", "CC BY-SA 4.0", "Terrace_farming_Uttarakhand.jpg"),
  tourism: p("Deepanshu Mittall", "CC BY-SA 4.0", "Laxman_Jhula,_Rishikesh,_Uttarkhand,_India.jpg"),
  wecd: p("KEmel49", "CC BY-SA 4.0", "Anganwadi_center.jpg"),
  almora: p("ArmouredCyborg", "CC BY-SA 4.0", "Almora_Sunset_Skyline.jpg"),
  bageshwar: p("ArmouredCyborg", "CC BY-SA 4.0", "Bageshwar_Bazaar.jpg"),
  chamoli: p("Vishwanath Negi", "CC BY-SA 3.0", "Gopeshwar_Chamoli.jpg"),
  champawat: p("WhiteRaven335", "CC BY-SA 4.0", "Champawat_town.jpg"),
  dehradun: p("Aditya Oberai", "CC BY-SA 4.0", "The_Dehradun_Clock_Tower.jpg"),
  haridwar: p("Whispyhistory", "CC BY-SA 4.0", "Har_Ki_Pauri_and_Clock_Tower_of_Haridwar.jpg"),
  nainital: p("Slyronit", "CC BY-SA 4.0", "Nainital_Lake_03.jpg"),
  pauri: p("Nitin Maletha", "CC BY-SA 4.0", "Dak_Ghar,_Pauri_Garhwal.jpg"),
  pithoragarh: p("ArmouredCyborg", "CC BY-SA 4.0", "Pithoragarh_skyline.jpg"),
  rudraprayag: p("Mukerjee", "CC BY-SA 3.0", "P1000137-41-rudraprayag-pano-g.jpg"),
  tehri: p("Himalayanwarrior", "CC BY 4.0", "View_of_New_Tehri_Town_in_Uttarakhand.jpg"),
  usnagar: p("RaviVerma2018", "CC BY-SA 4.0", "Metropolis_city_rudrapur.jpg"),
  uttarkashi: p("Atudu", "CC BY-SA 4.0", "Uttarkashi_city_WTK20150914-DSC_0003.jpg"),
};
