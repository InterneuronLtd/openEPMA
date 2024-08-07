//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Limited

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
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { v4 as uuid } from 'uuid';
import {
  Medication,
  Prescription,
  Prescriptionreviewstatus,
} from 'src/app/models/EPMA';
import {
  filter,
  filterparam,
  filterParams,
  filters,
  orderbystatement,
  selectstatement,
} from 'src/app/models/filter.model';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { UpsertTransactionManager } from 'src/app/services/upsert-transaction-manager.service';
import { SubjectsService } from 'src/app/services/subjects.service';
import { InfusionType, PrescriptionContext, PrescriptionStatus } from 'src/app/services/enum';

@Component({
  selector: 'app-pharmacy-review',
  templateUrl: './pharmacy-review.component.html',
  styleUrls: ['./pharmacy-review.component.css'],
})
export class PharmacyReviewComponent implements OnInit, OnDestroy {
  subscriptions: Subscription = new Subscription();
  PrescriptionID: any;
  prescriptioncurrent: Prescription;
  //showthiscomponent: boolean = false;
  showDetails: boolean;
  changestatus: boolean = false;
  prescriptionsourceold: string;
  prescriptionsourcenew: string;
  chosenDaysold: any;
  chosenDaysnew: any;
  prescriptionAdditionalConditionsold: string;
  prescriptionstatusold: string;
  distinctDateold: string[];
  prescriptionAdditionalConditionsnew: string;
  distinctDatenew: any[];
  originalstatus: string;
  errormesage = '';
  showspinner: boolean = false;

  MoaPriscription: Prescription;
  showEditPrescription = false;
  showActionButton = true;
  @Input('prescription') Prescription: Prescription

  // values to determine modal from drug chart or reconciliation
  typeOfMedicine: boolean = false;
  commentsHeader: string;

  constructor(
    public subjects: SubjectsService,
    public appService: AppService,
    private apiRequest: ApirequestService
  ) {
  }

  public prescription: Array<Prescription>;
  public therapyType = 'therapy';
  primaryMedication: Medication;
  oldprescription: Prescription;
  currentreviewstatus: string = '';
  medicinename = '';
  pharmacyComments: string = '';
  editedprescription: Prescription;
  presCreatedMessage = "Created"

  public prescriptionreviewstatus: Array<Prescriptionreviewstatus>;
  ngOnInit(): void {

    this.init(this.Prescription);
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }


  init(Prescription: Prescription) {
    if (Prescription.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Admission).prescriptioncontext_id) {
      this.presCreatedMessage = "MOA Added"
    }

    if (Prescription.moatoip) {
      let formularycode = Prescription.__medications.find(x => x.isprimary).__codes.find(y => y.terminology == "formulary").code;
      this.MoaPriscription = this.appService.Prescription.find(
        x => x.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Admission).prescriptioncontext_id &&
          (x.__medications.find(y => y.isprimary == true).__codes.filter(z => z.terminology == "formulary" && z.code == formularycode).length != 0)
      )
    }

    let prescriptionStatus = this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == Prescription.prescriptionstatus_id).status;
    if (prescriptionStatus == PrescriptionStatus.stopped || prescriptionStatus == PrescriptionStatus.cancelled || prescriptionStatus == PrescriptionStatus.suspended) {
      this.showActionButton = false;
    }
    else {
      this.showActionButton = true;
    }
    if (Prescription.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Inpatient).prescriptioncontext_id
      && Prescription.infusiontype_id != InfusionType.ci && Prescription.infusiontype_id != InfusionType.pca  && Prescription.infusiontype_id != InfusionType.rate) {
      this.showEditPrescription = true;
    }
    else {
      this.showEditPrescription = false;
    }
    // this.showthiscomponent = true;
    this.showspinner = true;
    this.prescriptioncurrent = Prescription;
    this.PrescriptionID = Prescription.prescription_id;
    this.pharmacyComments = '';
    this.errormesage = '';
    this.baseviewgetreviewhistory();
    if (this.prescriptioncurrent.prescriptioncontext_id != this.appService.MetaPrescriptioncontext.find(pc => pc.context === PrescriptionContext.Admission).prescriptioncontext_id) {
      this.typeOfMedicine = false;
    }
    else {
      this.typeOfMedicine = true;
    }
   
    // this.typeOfMedicine = this.appService.checkMedicineTypeForMoa(
    //   this.prescriptioncurrent
    // );
    this.commentsHeader = this.typeOfMedicine ? 'Review Comment' : 'Status';

  }

  baseviewgetreviewhistory() {
    this.oldprescription = new Prescription();
    this.editedprescription = new Prescription();

    this.prescription = [];
    this.subscriptions.add(
      this.apiRequest
        .postRequest(
          this.appService.baseURI + '/GetBaseViewListByPost/epma_reviewhistory',
          this.CreateSessionFilter()
        )
        .subscribe((response) => {
          for (let prescription of response) {
            prescription.__posology = JSON.parse(prescription.__posology);
            prescription.__routes = JSON.parse(prescription.__routes);
            prescription.__medications = JSON.parse(prescription.__medications);
            this.prescription.push(<Prescription>prescription);
          }
          this.gettherapyType();
          this.getreviewhistory();
        })
    );
  }

  closePopup() {
    // this.showthiscomponent = false;
    this.subjects.closeAppComponentPopover.next();
  }
  isShowDateold(starteDate: any) {
    let date = this.distinctDateold.find(
      (x) =>
        moment(new Date(x)).format('DD-MMM-YYYY HH:mm') ==
        moment(new Date(starteDate.dosestartdatetime)).format(
          'DD-MMM-YYYY HH:mm'
        )
    );
    if (date) {
      return moment(new Date(starteDate.dosestartdatetime)).format(
        'DD-MMM-YYYY'
      );
    } else {
      return '';
    }
  }

  isShowDatenew(starteDate: any) {
    let date = this.distinctDatenew.find(
      (x) =>
        moment(new Date(x)).format('DD-MMM-YYYY HH:mm') ==
        moment(new Date(starteDate.dosestartdatetime)).format(
          'DD-MMM-YYYY HH:mm'
        )
    );
    if (date) {
      return moment(new Date(starteDate.dosestartdatetime)).format(
        'DD-MMM-YYYY'
      );
    } else {
      return '';
    }
  }

  assignPrescription(
    oldValue: Prescription,
    newValue: Prescription,
    firstprescription = false
  ) {
    if (!firstprescription) {
      this.oldprescription = oldValue;
      this.editedprescription = newValue;
      this.getAdditionalcondition();
      this.GetSource();
      this.GetChosenDays();
      this.getPrescriptionStatus();
      this.getAdditionalcondition();
      this.distinctDateold = this.appService.GetCurrentPosology(this.oldprescription).__dose
        .filter(
          (thing, i, arr) =>
            arr.findIndex(
              (t) =>
                moment(new Date(t.dosestartdatetime)).format('DD-MM-YYYY') ===
                moment(new Date(thing.dosestartdatetime)).format('DD-MM-YYYY')
            ) === i
        )
        .map((x) => x.dosestartdatetime);
      this.distinctDatenew = this.appService.GetCurrentPosology(this.editedprescription).__dose
        .filter(
          (thing, i, arr) =>
            arr.findIndex(
              (t) =>
                moment(new Date(t.dosestartdatetime)).format('DD-MM-YYYY') ===
                moment(new Date(thing.dosestartdatetime)).format('DD-MM-YYYY')
            ) === i
        )
        .map((x) => x.dosestartdatetime);
      this.showDetails = true;
    }
  }
  getPrescriptionEvents() {
    this.subscriptions.add(
      this.apiRequest
        .getRequest(
          this.appService.baseURI +
          '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_prescriptionevent&synapseattributename=prescriptionid&attributevalue=' +
          this.PrescriptionID
        )
        .subscribe((response) => {
          let responseArray = JSON.parse(response);

          responseArray = []

          // for (let r of responseArray) {
          //   let prescriptionreviewstatus = new Prescriptionreviewstatus();
          //   prescriptionreviewstatus.__isprescriptionevent = true;
          //   prescriptionreviewstatus.modifiedby = r.createdby;
          //   prescriptionreviewstatus.modifiedon = r.datetime;
          //   prescriptionreviewstatus.reviewcomments = r.comments;
          //   prescriptionreviewstatus.precriptionedited = false;
          //   prescriptionreviewstatus.status = "";
          //   // this.prescriptionreviewstatus.find((x) => x.__newprescriptiondata.correlationid == r.correlationid
          //   // ).status;
          //   prescriptionreviewstatus.__prescriptionEventStatus =
          //     this.appService.MetaPrescriptionstatus.find(
          //       (x) => x.prescriptionstatus_id == r.prescriptionstatusid
          //     ).status;
          //   prescriptionreviewstatus.__prescriptionEventStatus =
          //     prescriptionreviewstatus.__prescriptionEventStatus
          //       .charAt(0)
          //       .toUpperCase() +
          //     prescriptionreviewstatus.__prescriptionEventStatus.slice(1);
          //   this.prescriptionreviewstatus.push(
          //     <Prescriptionreviewstatus>prescriptionreviewstatus
          //   );
          // }

          for (let r of this.prescriptionreviewstatus) {
            if (r.prescriptionstatuschange) {

              let statusid = this.appService.prescriptionEvent.find(x => x.epma_prescriptionevent_id == r.epma_prescriptionevent_id)
              r.reviewcomments = statusid.comments;
              r.modifieddatetime = statusid.datetime;
              r.__prescriptionEventStatus =
                this.appService.MetaPrescriptionstatus.find(
                  (x) => x.prescriptionstatus_id == statusid.prescriptionstatusid
                ).status;

              r.__prescriptionEventStatus =
                r.__prescriptionEventStatus
                  .charAt(0)
                  .toUpperCase() +
                r.__prescriptionEventStatus.slice(1);
            }
          }

          this.prescriptionreviewstatus.sort((a, b) =>
            moment(a.modifiedon) > moment(b.modifiedon)
              ? 1
              : moment(b.modifiedon) > moment(a.modifiedon)
                ? -1
                : 0
          );
          let status = "";
          for (let r of this.prescriptionreviewstatus) {

            if (r.status == "") {
              r.status = status;
            }
            status = r.status
          }
          this.prescriptionreviewstatus.sort((b, a) =>
            moment(a.modifiedon) > moment(b.modifiedon)
              ? 1
              : moment(b.modifiedon) > moment(a.modifiedon)
                ? -1
                : 0
          );
          this.showspinner = false;
        })
    );
  }
  getreviewhistory() {
    this.prescriptionreviewstatus = [];

    this.subscriptions.add(
      this.apiRequest
        .getRequest(
          this.appService.baseURI +
          '/GetListByAttribute?synapsenamespace=local&synapseentityname=epma_prescriptionreviewstatus&synapseattributename=prescription_id&attributevalue=' +
          this.PrescriptionID
        )
        .subscribe((response) => {
          let responseArray = JSON.parse(response);
          responseArray.sort((a, b) =>
            moment(a.modifiedon) > moment(b.modifiedon)
              ? 1
              : moment(b.modifiedon) > moment(a.modifiedon)
                ? -1
                : 0
          );

          for (let r of responseArray) {
            if (r.oldcorrelationid) {
              r.__oldprescriptiondata = [];
              r.__oldprescriptiondata = this.prescription.find(
                (x) => r.oldcorrelationid == x.correlationid
              );
            } else {
              r.__oldprescriptiondata = [];
              r.__oldprescriptiondata = this.prescription.find(
                (x) => r.newcorrelationid == x.correlationid
              );
            }
            r.__newprescriptiondata = [];
            r.__newprescriptiondata = this.prescription.find(
              (x) => r.newcorrelationid == x.correlationid
            );
            if (r.__newprescriptiondata) {
              this.medicinename = this.prescription.find(
                (x) => r.newcorrelationid == x.correlationid
              ).__medications[0].name;
            }
            if(!r.modifieddatetime){
            r.modifieddatetime = r.modifiedon;
            }
            this.prescriptionreviewstatus.push(<Prescriptionreviewstatus>r);
          }
          this.currentreviewstatus = "d219dd6d-aafc-4aa3-bad0-5ffcc87d0134";
          // this.prescriptionreviewstatus[
          //   this.prescriptionreviewstatus.length - 1
          // ].status;
          this.originalstatus = this.currentreviewstatus;

          //if(this.presCreatedMessage !='MOA Added'){
          this.getPrescriptionEvents();

        })
    );
  }
prescriptionstatuscheck(reviewid){
  if(reviewid){
   
  let prescriptionStatus = this.appService.MetaPrescriptionstatus.find(x => x.prescriptionstatus_id == this.appService.prescriptionEvent.find(x => x.epma_prescriptionevent_id ==reviewid).prescriptionstatusid).status;
  if (prescriptionStatus == "suspended" || prescriptionStatus == "stopped" || prescriptionStatus == "cancelled" || prescriptionStatus == "restarted") {
    return "Prescription "+prescriptionStatus
  }
 }
  return "";
}
  getDiscription(id: any) {
    return this.appService.MetaReviewstatus.find((x) => x.reviewstatus_id == id)
      .description;
  }
  gettherapyType() {
    this.primaryMedication = this.prescription[0].__medications.find(
      (e) => e.isprimary == true
    );
    if (!this.primaryMedication.form) {
      this.therapyType = 'therapy';
    } else if (
      this.primaryMedication.form.toLowerCase().indexOf('tablet') != -1 ||
      this.primaryMedication.form.toLowerCase().indexOf('capsule') != -1
    ) {
      this.therapyType = 'TabletorCapsule';
    } else if (
      this.primaryMedication.form.toLowerCase().indexOf('injection') != -1
    ) {
      this.therapyType = 'Injection';
    } else if (
      this.primaryMedication.form.toLowerCase().indexOf('infusion') != -1
    ) {
      this.therapyType = 'ContinuousInfusion';
    } else if (
      this.primaryMedication.form.toLowerCase().indexOf('fluid') != -1
    ) {
      this.therapyType = 'BasicFluids';
    } else if (
      this.primaryMedication.form.toLowerCase().indexOf('inhalation') != -1
    ) {
      this.therapyType = 'Inhalation';
    } else {
      this.therapyType = 'therapy';
    }
  }
  GetRoutes(prs: Prescription) {
    return prs.__routes.map((m) => m.route).join(',');
  }
  GetChoosenDays(prs: Prescription) {
    return JSON.parse(this.appService.GetCurrentPosology(prs).daysofweek).join(',');
  }
  GetAdditionalcondition(prs: Prescription) {
    var condition = this.appService.MetaPrescriptionadditionalcondition.find(
      (x) =>
        x.prescriptionadditionalconditions_id ==
        prs.prescriptionadditionalconditions_id
    );
    if (condition)
      return this.appService.MetaPrescriptionadditionalcondition.find(
        (x) =>
          x.prescriptionadditionalconditions_id ==
          prs.prescriptionadditionalconditions_id
      ).additionalcondition;
    else return 'No additional criteria';
  }
  CreateSessionFilter() {
    const condition = 'prescription_id=@prescription_id';
    const f = new filters();
    f.filters.push(new filter(condition));

    const pm = new filterParams();
    pm.filterparams.push(
      new filterparam('prescription_id', this.PrescriptionID)
    );

    const select = new selectstatement('SELECT *');

    const orderby = new orderbystatement('ORDER BY 2');

    const body = [];
    body.push(f);
    body.push(pm);
    body.push(select);
    body.push(orderby);

    return JSON.stringify(body);
  }

  GetSource() {
    if (this.oldprescription.prescriptionsource_id) {
      this.prescriptionsourceold = this.appService.MetaPrescriptionSource.find(
        (e) =>
          e.prescriptionsource_id == this.oldprescription.prescriptionsource_id
      ).source;
    } else {
      this.prescriptionsourceold = null;
    }

    if (this.editedprescription.prescriptionsource_id) {
      this.prescriptionsourcenew = this.appService.MetaPrescriptionSource.find(
        (e) =>
          e.prescriptionsource_id ==
          this.editedprescription.prescriptionsource_id
      ).source;
    } else {
      this.prescriptionsourcenew = null;
    }
  }

  GetChosenDays() {
    this.chosenDaysold = JSON.parse(
      this.appService.GetCurrentPosology(this.oldprescription).daysofweek
    ).join(',');
    this.chosenDaysnew = JSON.parse(
      this.appService.GetCurrentPosology(this.editedprescription).daysofweek
    ).join(',');
  }

  getPrescriptionStatus() {
    var status = this.appService.MetaPrescriptionstatus.find(
      (x) =>
        x.prescriptionstatus_id == this.oldprescription.prescriptionstatus_id
    );
    if (status)
      this.prescriptionstatusold = this.appService.MetaPrescriptionstatus.find(
        (x) =>
          x.prescriptionstatus_id == this.oldprescription.prescriptionstatus_id
      ).status;
    else this.prescriptionstatusold = 'active';
  }
  // getLegendPrescriptionStatus(status: string) {
  //   var id = this.metaprescriptionstatus.find(x => x.status == status).prescriptionstatus_id;
  //   var psatus = this.appService.Prescription.filter(p => p.prescriptionstatus_id == id && p.prescription_id == this.prescription_id)
  //   if (psatus.length > 0)
  //     return true;
  //   else
  //     return false;
  // }
  getAdditionalcondition() {
    var condition = this.appService.MetaPrescriptionadditionalcondition.find(
      (x) =>
        x.prescriptionadditionalconditions_id ==
        this.oldprescription.prescriptionadditionalconditions_id
    );
    if (condition)
      this.prescriptionAdditionalConditionsold =
        this.appService.MetaPrescriptionadditionalcondition.find(
          (x) =>
            x.prescriptionadditionalconditions_id ==
            this.oldprescription.prescriptionadditionalconditions_id
        ).additionalcondition;
    else this.prescriptionAdditionalConditionsold = 'No additional criteria';

    var condition2 = this.appService.MetaPrescriptionadditionalcondition.find(
      (x) =>
        x.prescriptionadditionalconditions_id ==
        this.editedprescription.prescriptionadditionalconditions_id
    );
    if (condition2)
      this.prescriptionAdditionalConditionsnew =
        this.appService.MetaPrescriptionadditionalcondition.find(
          (x) =>
            x.prescriptionadditionalconditions_id ==
            this.editedprescription.prescriptionadditionalconditions_id
        ).additionalcondition;
    else this.prescriptionAdditionalConditionsnew = 'No additional criteria';
  }

  currentreviewstatuschange() {
    if (this.presCreatedMessage == "MOA Added"  &&
    this.pharmacyComments.trim() == '') {
      this.errormesage = 'Please Enter comments';
      return;
    }
    if (
      this.currentreviewstatus == '8fb36f43-4b5f-487b-aa79-ed95d34ea70e' &&
      this.pharmacyComments.trim() == ''
    ) {
      this.errormesage = 'Please Enter comments';
      return;
    } else {
      this.errormesage = '';
    }
    let prescriptionreviewstatus = new Prescriptionreviewstatus();
    prescriptionreviewstatus.epma_prescriptionreviewstatus_id = uuid();
    prescriptionreviewstatus.person_id = this.prescriptioncurrent.person_id;
    prescriptionreviewstatus.prescription_id = this.PrescriptionID;
    prescriptionreviewstatus.precriptionedited = false;
    prescriptionreviewstatus.modifiedby = this.appService.loggedInUserName;
    prescriptionreviewstatus.modifiedon =
      this.appService.getDateTimeinISOFormat(moment().toDate());
      prescriptionreviewstatus.modifieddatetime =
      this.appService.getDateTimeinISOFormat(moment().toDate());
    prescriptionreviewstatus.reviewcomments = this.pharmacyComments;

    prescriptionreviewstatus.status = this.currentreviewstatus;
    // if (this.originalstatus == 'b86d30f4-d8db-484e-9c6f-1e67fbd89c8e') {
    //   prescriptionreviewstatus.status = 'd219dd6d-aafc-4aa3-bad0-5ffcc87d0134';
    // }
    // IF MOA prescription apply gray batch
    if (this.prescriptioncurrent.prescriptioncontext_id == this.appService.MetaPrescriptioncontext.find(x => x.context == PrescriptionContext.Admission).prescriptioncontext_id) {
      prescriptionreviewstatus.status = 'b86d30f4-d8db-484e-9c6f-1e67fbd89c8e';
    }


    prescriptionreviewstatus.oldcorrelationid = null;
    prescriptionreviewstatus.newcorrelationid = null;
    Object.keys(prescriptionreviewstatus).map((e) => {
      if (e.startsWith('_')) delete prescriptionreviewstatus[e];
    });
    var upsertManager = new UpsertTransactionManager();
    upsertManager.beginTran(this.appService.baseURI, this.apiRequest);

    upsertManager.addEntity(
      'local',
      'epma_prescriptionreviewstatus',
      JSON.parse(JSON.stringify(prescriptionreviewstatus))
    );
    upsertManager.save(
      (resp: any) => {
        this.appService.UpdateDataVersionNumber(resp);

        this.baseviewgetreviewhistory();
        this.appService.Prescriptionreviewstatus.push(prescriptionreviewstatus);
        this.subjects.refreshTemplate.next(
          this.prescriptioncurrent.prescription_id
        );
        this.currentreviewstatus = '';
        this.pharmacyComments = '';
        this.changestatus = false;
        this.errormesage = '';
        upsertManager.destroy();
        // this.appService.DoseEvents.push(resp);
      },
      (error) => {
        this.appService.logToConsole(error);
        upsertManager.destroy();

        if (this.appService.IsDataVersionStaleError(error)) {
          this.appService.RefreshPageWithStaleError(error);
        }
      }, false
    );

  }

  selectreviewstatuschange(status: any) {
    this.currentreviewstatus = status;
    this.errormesage = '';
  }
  closechangestatus() {
    this.changestatus = false;
    this.errormesage = '';
  }
  editTherapy() {
    // this.showthiscomponent = false;
    this.subjects.closeAppComponentPopover.next();

    setTimeout(() => {
      this.subjects.editPrescription.next(this.prescriptioncurrent);
    }, 500);
  }
}
