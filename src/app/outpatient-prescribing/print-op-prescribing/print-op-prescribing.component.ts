//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2025  Interneuron Limited

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { Indication } from 'src/app/components/prescribing-form/formhelper';
import { Opprescriptiontherapies, Prescription, Medicationsummary, MetaPrescriptionadditionalcondition, ProtocalDose } from 'src/app/models/EPMA';
import { filter, filterparam, filterParams, filters, orderbystatement, selectstatement } from 'src/app/models/filter.model';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { SubjectsService } from 'src/app/services/subjects.service';

@Component({
  selector: 'app-print-op-prescribing',
  templateUrl: './print-op-prescribing.component.html',
  styleUrls: ['./print-op-prescribing.component.css']
})
export class PrintOpPrescribingComponent implements OnInit {

  patientName: string;
  hospitalNumber: string;
  nhsNumber: string;
  gender: string;
  dob: string;
  age: number;
  address: string;
  leadConsultant: string;
  specialty: string;
  encounterStatus: string;
  admitDatetime: string;
  dischargeDatetime: string;
  obsDate: string;
  obsValue: string;
  isControlDrug: boolean;
  isexpecteddateofdischarge: boolean = false;
  firstname: string;
  familyname: string;
  dischargeSumPrescriptionId
  patientDetails: any;
  opPrescribedBy: string;
  opModifiedByRole: string;
  prescriptionType: string;

  allergyIntoleranceList: any;

  selectedItem: any;
  opSubscription = new Subscription();
  subscriptions: Subscription = new Subscription();
  prescriptions: Array<any>;
  Oppatienttheripy: Array<Opprescriptiontherapies>;
  public MetaPrescriptionadditionalcondition: Array<MetaPrescriptionadditionalcondition>;

  @ViewChild('printBody') printBody: ElementRef;
  @Input('clinicDate') clinicDate: any
  @Input('printOPTemplate') printOPTemplate: any
  @Output() destroyTemplate: EventEmitter<any> = new EventEmitter();

  constructor(private subjects: SubjectsService, public appService: AppService, private apiRequest: ApirequestService) {
  }

  ngOnInit(): void {
    this.opPrescribedBy = this.clinicDate.prescriber;
    this.opModifiedByRole = this.appService.JSONTryParse(this.clinicDate.modifiedbyrole)??[].join(", ");
    this.prescriptionType = this.clinicDate.prescriptiontype
    this.getPASData();
    this.getAllergies();
    this.getEncounterDetails();
    this.getWeight();
    this.getoppatienttherapy();
  }

  getPASData()
  {
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + '/GetBaseViewListByPost/dischargesummary_persondetails',this.createClinicalSummaryNotesFilter())
        .subscribe((response) => {
          if(response)
          {
            let dsPersonDetails: any;
            dsPersonDetails = response;
            this.patientDetails = dsPersonDetails;
            dsPersonDetails.forEach(element => {
              this.patientName = element.name;
              this.hospitalNumber = element.hospitalnumber;
              this.nhsNumber = element.nhsnumber;
              this.gender = element.gender;
              this.dob = element.dob;
              this.age = moment(dsPersonDetails != null ?  moment(): '', moment.ISO_8601).diff(moment(element.dateofbirth, moment.ISO_8601), "years");
              this.patientDetails[0].age = this.age;
              this.firstname = element.firstname;
              this.familyname = element.familyname;
              this.address = element.address;
            });
          }
        })
      );
  }

  getEncounterDetails(){
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + '/GetBaseViewListByPost/dischargesummary_encounterdetails',this.createEncounterDetailsFilter())
      .subscribe((response) => {
        var encounterDetails = response;
        encounterDetails.forEach(element => {
          this.admitDatetime = element.admitdatetime;
          this.leadConsultant = element.consultingdoctortext;
          this.dischargeDatetime = element.dischargedatetime;
          this.specialty = element.specialtytext;
          this.isexpecteddateofdischarge = element.isexpecteddateofdischarge;
        });
      })
    )
  }

  getAllergies(){
    this.subscriptions.add(
      this.apiRequest.getRequest(this.appService.baseURI +  "/GetBaseViewListByAttribute/terminus_personallergylist?synapseattributename=person_id&attributevalue=" + this.appService.personId + "&orderby=clinicalstatusvalue ASC, causativeagentcodesystem DESC, _sequenceid DESC")
      .subscribe((response) => {
          let allergies = JSON.parse(response);
          this.allergyIntoleranceList = allergies.filter(x => x.clinicalstatusvalue == 'Active' || x.clinicalstatusvalue == 'Resolved');
          this.allergyIntoleranceList.forEach((element,index) => {
          this.allergyIntoleranceList[index].reactionconcepts = JSON.parse(element.reactionconcepts);
        });
      })
    )
  }

  getWeight(){
    this.subscriptions.add(
      this.apiRequest.postRequest(this.appService.baseURI + "/GetBaseViewListByPost/fluidbalance_getweightobservations", this.createWeightFilter())
        .subscribe((response) => {
          if (response.length > 0) {
            if (response[0].value != "" || response[0].value != null){
              this.obsValue = response[0].value;
              this.obsDate = response[0].observationeventdatetime;
            }
            else{
              this.obsValue = null;
              this.obsDate = null;
            } 
          }
          else{
            this.obsValue = null;
            this.obsDate = null;
          }
        })
    );
  }

  getoppatienttherapy() {
    this.selectedItem = this.appService.outPatientPrescriptionSelected;
    
    if (this.selectedItem != "") {
      this.opSubscription.unsubscribe();
      this.opSubscription = new Subscription();
      this.prescriptions = [];
      this.opSubscription.add(this.apiRequest.getRequest(this.appService.baseURI + "/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_opprescriptiontherapies&synapseattributename=epma_outpatientprescriptions_id&attributevalue=" + this.selectedItem).subscribe(
        (response) => {
          this.Oppatienttheripy = JSON.parse(response);
          let arr = this.appService.optherapies.find(x => x.opid == this.selectedItem)
          if (arr) {
            arr.opprescriptions = this.Oppatienttheripy.map(x => x.prescription_id)
          }
          else {
            this.appService.optherapies.push({ opid: this.selectedItem, opprescriptions: this.Oppatienttheripy.map(x => x.prescription_id) })
          }
          let prescriptions = [];
          for (let r of this.Oppatienttheripy) {

            prescriptions.push(this.appService.Prescription.find(x => x.prescription_id == r.prescription_id));

            // console.log('this.prescriptions',this.prescriptions);

            // this.showprescriptionlist = true;

          }
          for (let pres of prescriptions) {
              this.prescriptions.push(this.makePrescripcriptionSummary(pres));
          }
          if(this.printOPTemplate == 'controlleddrugs') {
            this.prescriptions = this.prescriptions.filter(x => x.printingrequired == true)
          }

        }
      ));
    }
  }

  makePrescripcriptionSummary(prescription: Prescription) {
    let medicationsummary = new Medicationsummary()
    medicationsummary.medicationid = prescription.__medications.find(x => x.isprimary == true).medication_id
    medicationsummary.prescriptionid = prescription.prescription_id;
    medicationsummary.iscontrolleddrug = prescription.__medications.find(x => x.isprimary == true).iscontrolled
    medicationsummary.displayname=""
    medicationsummary.comments = prescription.comments
    medicationsummary.startdatetime = prescription.startdatetime
    medicationsummary.printingrequired = prescription.printingrequired
    medicationsummary.prescriptionenddate = this.appService.GetCurrentPosology(prescription).prescriptionenddate
    if(this.GetCurrentPosology(prescription).frequency == 'protocol' || this.GetCurrentPosology(prescription).frequency == 'variable')
    {
      medicationsummary.protocoldose = this.GetVariableProtocalDose(prescription);
      medicationsummary.protocolmessage = this.getProtocolMessage(prescription);
    }
    medicationsummary.indication = this.GetIndication(prescription)
    
    medicationsummary.displayname=prescription.__medications.find(x=>x.isprimary).name + " (" + prescription.__medications.find(x=>x.isprimary).__ingredients[0].name + ")";
  
    medicationsummary.displaydose=this.getDoseName(prescription);
    medicationsummary.displayroute=prescription.__routes.sort((x,y)=> Number(y.isdefault) - Number(x.isdefault)).map(m => m.route).join(",")

    medicationsummary.displayquantity="TOTAL QUANTITY : "
    if(this.GetCurrentPosology(prescription).totalquantity){
      medicationsummary.displayquantity= medicationsummary.displayquantity+" " +this.GetCurrentPosology(prescription).totalquantity + " (" + this.numberToEnglish(this.GetCurrentPosology(prescription).totalquantity) + ")"
      if(this.GetCurrentPosology(prescription).dosetype=='units'){
        medicationsummary.displayquantity= medicationsummary.displayquantity+" "+ this.GetCurrentPosology(prescription).__dose[0].doseunit
      }
      if(this.GetCurrentPosology(prescription).dosetype=='strength'){
        medicationsummary.displayquantity= medicationsummary.displayquantity+" "+ this.GetCurrentPosology(prescription).__dose[0].strengthdenominatorunit
      }
    }
    if(this.GetCurrentPosology(prescription).totalquantitytext){
      medicationsummary.displayquantity= medicationsummary.displayquantity+" " +this.GetCurrentPosology(prescription).totalquantitytext
    }
    medicationsummary.displaystatus=null;
    return prescription.__medicationsummary=medicationsummary;

  }

  GetVariableProtocalDose(prescription:Prescription) {
    let protocalDose: ProtocalDose[] =[];
    let currentPosology = this.GetCurrentPosology(prescription);
    let doseList = currentPosology.__dose;
    doseList.forEach((dose, index) => {
        let d: ProtocalDose = new ProtocalDose();
        if(doseList.indexOf(dose) == 0 || moment(dose.dosestartdatetime).format('YYYYMMDD') != moment(doseList[index - 1].dosestartdatetime).format('YYYYMMDD'))
        {
          d.isShowDate = true;
        }
        else{
          d.isShowDate = false;
        }
        if(currentPosology.dosetype=='units') {
          if(currentPosology.infusiontypeid) {
            d.date = dose.dosestartdatetime;
            d.text = dose.infusionrate + ' ' + currentPosology.infusionrateunits;
            protocalDose.push(d)
          }
          if(!currentPosology.infusiontypeid && dose.dosesize) {
            d.date = dose.dosestartdatetime;
            d.text = dose.dosesize  + ((dose.dosesizerangemax)? '-' + dose.dosesizerangemax : '') + dose.doseunit;
            protocalDose.push(d)
          }
        }
        if(currentPosology.dosetype=='strength') {
          if(currentPosology.infusiontypeid) {
            d.date = dose.dosestartdatetime;
            d.text = dose.infusionrate + ' ' + ((currentPosology.infusionrateunits)? currentPosology.infusionrateunits : 'ml/h');
            protocalDose.push(d)
          }
          if(!currentPosology.infusiontypeid && dose.strengthneumerator) {
            d.date = dose.dosestartdatetime;
            if(!(currentPosology.frequency=='protocol' && !dose.strengthdenominator && !dose.strengthneumerator)) {
              d.text = dose.strengthneumerator  + dose.strengthneumeratorunit +  '/' + dose.strengthdenominator  +  dose.strengthdenominatorunit;
            }
            protocalDose.push(d)
          }
        }
        if(currentPosology.dosetype=='descriptive') {
          d.date = dose.dosestartdatetime;
          d.text = dose.descriptivedose;
          protocalDose.push(d)
        }
    });
    return protocalDose;
  }

  getProtocolMessage(prescription: Prescription) {
    let posology = this.appService.GetCurrentPosology(prescription);
    if (posology.repeatlastday == true && posology.repeatlastdayuntil == null) {
      return "Last day of the protocol repeated until cancelled";
    }
    else if (posology.repeatlastday == true && posology.repeatlastdayuntil != null) {
      return "Last day of the protocol repeated until the " + moment(posology.repeatlastdayuntil).format("Do MMM YYYY");
    }
    else if (+posology.repeatprotocoltimes > 0) {
      return "Repeated " + posology.repeatprotocoltimes + " time(s) until the " + (posology.prescriptionenddate == null ? "cancelled" : moment(posology.prescriptionenddate).format("Do MMM YYYY"));
    }
  }

  getDoseName(prescription: Prescription) {
    let DoseName = "";
    if (this.GetCurrentPosology(prescription).dosetype == "units") {
      if (this.GetCurrentPosology(prescription).frequency == '' || this.GetCurrentPosology(prescription).frequency == 'x' || this.GetCurrentPosology(prescription).frequency == 'h' || this.GetCurrentPosology(prescription).frequency == 'stat' || this.GetCurrentPosology(prescription).frequency == 'mor' || this.GetCurrentPosology(prescription).frequency == 'mid' || this.GetCurrentPosology(prescription).frequency == 'eve' || this.GetCurrentPosology(prescription).frequency == 'night') {
        if (this.GetCurrentPosology(prescription).__dose.length > 0 && !this.GetCurrentPosology(prescription).__dose[0].dosestrength) {
          if(this.GetCurrentPosology(prescription).__dose[0].dosesize == null)
          {
            DoseName = "dose not defined";
          } 
          else
          {
            DoseName = DoseName + this.GetCurrentPosology(prescription).__dose[0].dosesize + " " + this.GetCurrentPosology(prescription).__dose[0].doseunit
          }         
          if (this.GetCurrentPosology(prescription).__dose[0].dosesizerangemax) {
            DoseName = DoseName + "-" + this.GetCurrentPosology(prescription).__dose[0].dosesizerangemax + " " + this.GetCurrentPosology(prescription).__dose[0].doseunit
          }
        }
        if (this.GetCurrentPosology(prescription).__dose.length > 0 && this.GetCurrentPosology(prescription).__dose[0].dosestrength) {
          DoseName = DoseName + this.GetCurrentPosology(prescription).__dose[0].dosestrength + " " + this.GetCurrentPosology(prescription).__dose[0].dosestrengthunits
          if (this.GetCurrentPosology(prescription).__dose[0].dosesizerangemax) {
            DoseName = DoseName + "-" + this.GetCurrentPosology(prescription).__dose[0].dosestrengthrangemax + " " + this.GetCurrentPosology(prescription).__dose[0].dosestrengthunits
          }
        }

      }
      if (this.GetCurrentPosology(prescription).frequency == "variable") {
        DoseName = DoseName + " Variable"
      }
      if (this.GetCurrentPosology(prescription).frequency == "protocol") {
        DoseName = DoseName + " Protocol"
      }
    }
    if (this.GetCurrentPosology(prescription).dosetype == "strength") {
      if (this.GetCurrentPosology(prescription).frequency == '' || this.GetCurrentPosology(prescription).frequency == 'x' || this.GetCurrentPosology(prescription).frequency == 'h' || this.GetCurrentPosology(prescription).frequency == 'stat' || this.GetCurrentPosology(prescription).frequency == 'mor' || this.GetCurrentPosology(prescription).frequency == 'mid' || this.GetCurrentPosology(prescription).frequency == 'eve' || this.GetCurrentPosology(prescription).frequency == 'night') {
        if (this.GetCurrentPosology(prescription).__dose.length > 0) {
          DoseName = DoseName + this.GetCurrentPosology(prescription).__dose[0].strengthneumerator + " " + this.GetCurrentPosology(prescription).__dose[0].strengthneumeratorunit
          DoseName = DoseName + "/" + this.GetCurrentPosology(prescription).__dose[0].strengthdenominator + " " + this.GetCurrentPosology(prescription).__dose[0].strengthdenominatorunit
        }
        if (this.GetCurrentPosology(prescription).__dose.length > 0 && this.GetCurrentPosology(prescription).__dose[0].dosestrength) {
          DoseName = DoseName + this.GetCurrentPosology(prescription).__dose[0].dosestrength + " " + this.GetCurrentPosology(prescription).__dose[0].dosestrengthunits
          if (this.GetCurrentPosology(prescription).__dose[0].dosesizerangemax) {
            DoseName = DoseName + "-" + this.GetCurrentPosology(prescription).__dose[0].dosestrengthrangemax + " " + this.GetCurrentPosology(prescription).__dose[0].dosestrengthunits
          }
        }

      }
      if (this.GetCurrentPosology(prescription).frequency == "variable") {
        DoseName = DoseName + " Variable"
      }
      if (this.GetCurrentPosology(prescription).frequency == "protocol") {
        DoseName = DoseName + " Protocol"
      }
    }

    if (this.GetCurrentPosology(prescription).dosetype == "descriptive") {
      if (this.GetCurrentPosology(prescription).__dose.length > 0) {
        DoseName = DoseName + this.GetCurrentPosology(prescription).__dose[0].descriptivedose
      }
    }

    if (this.GetCurrentPosology(prescription).frequency == "mor") {
      DoseName = DoseName + " - Morning"
    }
    if (this.GetCurrentPosology(prescription).frequency == "mid") {
      DoseName = DoseName + " - Noon"
    }
    if (this.GetCurrentPosology(prescription).frequency == "eve") {
      DoseName = DoseName + " - Evening"
    }
    if (this.GetCurrentPosology(prescription).frequency == "night") {
      DoseName = DoseName + " - Night"
    }
    if (this.GetCurrentPosology(prescription).frequency == "stat") {
      DoseName = DoseName + " - Stat. dose"
    }
    if (this.GetCurrentPosology(prescription).frequency == "x") {
      DoseName = DoseName + " - " + this.GetCurrentPosology(prescription).frequencysize + " " + "time(s) per day"
    }
    if (this.GetCurrentPosology(prescription).frequency == "h") {
      DoseName = DoseName + " - Every" + this.GetCurrentPosology(prescription).frequencysize + " " + "hour(s)"
    }
    if (this.GetCurrentPosology(prescription).frequency == "m") {
      DoseName = DoseName + " - Every" + this.GetCurrentPosology(prescription).frequencysize + " " + "min(s)"
    }
    if (this.GetCurrentPosology(prescription).daysofweek && this.GetCurrentPosology(prescription).daysofweek.length > 2) {
      DoseName = DoseName + " " + JSON.parse(this.GetCurrentPosology(prescription).daysofweek).join(", ")
    }
    if (this.GetCurrentPosology(prescription).dosingdaysfrequencysize && this.GetCurrentPosology(prescription).dosingdaysfrequencysize > 0) {
      DoseName = DoseName + " - Every " + this.GetCurrentPosology(prescription).dosingdaysfrequencysize + "" +
        this.GetCurrentPosology(prescription).dosingdaysfrequency
    }
    // var condition = this.MetaPrescriptionadditionalcondition.find(x => x.prescriptionadditionalconditions_id == prescription.prescriptionadditionalconditions_id);

    // if (condition) {
    //   DoseName = DoseName + " " + this.MetaPrescriptionadditionalcondition.find(x => x.prescriptionadditionalconditions_id == prescription.prescriptionadditionalconditions_id).additionalcondition;
    // }

    if (this.GetCurrentPosology(prescription).doctorsorder) {
      DoseName = DoseName + " - Prescriber to confirm"
    }

    if (this.GetCurrentPosology(prescription).prn) {
      DoseName = DoseName + " - When needed"
      if (this.GetCurrentPosology(prescription).maxnumofdosesperday) {
        DoseName = DoseName + "(Max" + this.GetCurrentPosology(prescription).maxnumofdosesperday + " " + this.GetCurrentPosology(prescription).__dose[0].doseunit + " per day)"
      }
    }

    return DoseName;
  }

  GetCurrentPosology(p: Prescription, pos_id: string = null) {
    if (pos_id) {
      return p.__posology.find(p => p.posology_id == pos_id);
    }
    else
      return p.__posology.find(p => p.iscurrent == true);
  }

  numberToEnglish(n, custom_join_character?) {

    var string = n.toString(),
        units, tens, scales, start, end, chunks, chunksLen, chunk, ints, i, word, words;

    var and = custom_join_character || '';

    /* Is number zero? */
    if (parseInt(string) === 0) {
        return 'zero';
    }

    /* Array of units as words */
    units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

    /* Array of tens as words */
    tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    /* Array of scales as words */
    scales = ['', 'thousand', 'million', 'billion', 'trillion', 'quadrillion', 'quintillion', 'sextillion', 'septillion', 'octillion', 'nonillion', 'decillion', 'undecillion', 'duodecillion', 'tredecillion', 'quatttuor-decillion', 'quindecillion', 'sexdecillion', 'septen-decillion', 'octodecillion', 'novemdecillion', 'vigintillion', 'centillion'];

    /* Split user arguemnt into 3 digit chunks from right to left */
    start = string.length;
    chunks = [];
    while (start > 0) {
        end = start;
        chunks.push(string.slice((start = Math.max(0, start - 3)), end));
    }

    /* Check if function has enough scale words to be able to stringify the user argument */
    chunksLen = chunks.length;
    if (chunksLen > scales.length) {
        return '';
    }

    /* Stringify each integer in each chunk */
    words = [];
    for (i = 0; i < chunksLen; i++) {

        chunk = parseInt(chunks[i]);

        if (chunk) {

            /* Split chunk into array of individual integers */
            ints = chunks[i].split('').reverse().map(parseFloat);

            /* If tens integer is 1, i.e. 10, then add 10 to units integer */
            if (ints[1] === 1) {
                ints[0] += 10;
            }

            /* Add scale word if chunk is not zero and array item exists */
            if ((word = scales[i])) {
                words.push(word);
            }

            /* Add unit word if array item exists */
            if ((word = units[ints[0]])) {
                words.push(word);
            }

            /* Add tens word if array item exists */
            if ((word = tens[ints[1]])) {
                words.push(word);
            }

            /* Add 'and' string after units or tens integer if: */
            if (ints[0] || ints[1]) {

                /* Chunk has a hundreds integer or chunk is the first of multiple chunks */
                if (ints[2] || !i && chunksLen) {
                    words.push(and);
                }

            }

            /* Add hundreds word if array item exists */
            if ((word = units[ints[2]])) {
                words.push(word + ' hundred');
            }

        }

    }

    return words.reverse().join(' ').trim();

  }

  createClinicalSummaryNotesFilter()
  {
    let condition = "";
    let pm = new filterParams();
    condition = "person_id = @person_id";
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));

    let f = new filters();
    f.filters.push(new filter(condition));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY 1 DESC");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  createWeightFilter() {
    let condition = "person_id = @person_id and encounter_id = @encounter_id";
    let f = new filters()
    f.filters.push(new filter(condition));

    let pm = new filterParams();
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));
    pm.filterparams.push(new filterparam("encounter_id", this.appService.encounter.encounter_id));

    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY observationeventdatetime desc");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  createEncounterDetailsFilter()
  {
    let condition = "";
    let pm = new filterParams();
    condition = "person_id = @person_id AND encounter_id = @encounter_id";
    pm.filterparams.push(new filterparam("person_id", this.appService.personId));
    pm.filterparams.push(new filterparam("encounter_id", this.appService.encounter.encounter_id));
    let f = new filters();
    f.filters.push(new filter(condition));


    let select = new selectstatement("SELECT *");

    let orderby = new orderbystatement("ORDER BY 1 DESC");

    let body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  GetIndication(p: Prescription) {
    if (p.indication && p.indication.indexOf("indication") != -1 && p.indication.indexOf("code") != -1) {
      let ind = <Indication>JSON.parse(p.indication);
      if (ind.code == "other")
        return ind.indication + " - " + p.otherindications;
      else
        return ind.indication;
    }
    else
      return p.indication
  }

  pdfDownloaded() {
    this.destroyTemplate.emit('true');
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

}
