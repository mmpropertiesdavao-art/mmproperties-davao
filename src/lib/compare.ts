export const MAX_COMPARE = 4;
export type CompareItem = { id:string;slug:string;title:string;listingIntent:"sale"|"rent"|"sale_or_rent" };
export const COMPARE_EVENT="mm-compare-updated";
export function readCompare():CompareItem[]{if(typeof window==="undefined")return[];try{return JSON.parse(localStorage.getItem("mm-property-compare")||"[]").slice(0,MAX_COMPARE)}catch{return[]}}
export function writeCompare(items:CompareItem[]){localStorage.setItem("mm-property-compare",JSON.stringify(items.slice(0,MAX_COMPARE)));window.dispatchEvent(new Event(COMPARE_EVENT));}
