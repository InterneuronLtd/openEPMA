//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2022  Interneuron CIC

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
import { Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import moment from 'moment';
import { Subscription } from 'rxjs';
import { Bannerwarningoverrides } from 'src/app/models/EPMA';
import { ApirequestService } from 'src/app/services/apirequest.service';
import { AppService } from 'src/app/services/app.service';
import { SubjectsService } from 'src/app/services/subjects.service';
import { FormSettings } from '../prescribing-form/formhelper';
import { v4 as uuid } from 'uuid';

@Component({
  selector: 'app-banner-warnings',
  templateUrl: './banner-warnings.component.html',
  styleUrls: ['./banner-warnings.component.css']
})
export class BannerWarningsComponent implements OnInit {
  @ViewChild('open_bannerwarnings') open_bannerwarnings: ElementRef;
  @ViewChild('close_bannerwarnings') close_bannerwarnings: ElementRef;
  saveerror = false;
  subscriptions: Subscription = new Subscription();
  mainWarnings: Bannerwarningoverrides[];
  warningGroups: Array<string> = [];
  @Output() loadcomplete = new EventEmitter<any>();
  overriding = false;
  overridereason = "";
  constructor(public appService: AppService, public apiRequest: ApirequestService, public subjects: SubjectsService) {
    this.subjects.showBannerWarnings.subscribe((onlyrefresh) => {
      if (onlyrefresh == true)
        this.OpenBannerWarnings(true);
      else
        this.OpenBannerWarnings();
    });

    this.subjects.closeBannerWarnings.subscribe(() => {
      this.CloseBannerWarnings();
    });

  }

  OpenBannerWarnings(onlyrefresh = false) {
    this.GetBannerWarnings(() => {
      this.ApplyOverrideConfigurationToWarnings();
      this.SetBannerWarningStatus();
      if (onlyrefresh != true)
        this.open_bannerwarnings.nativeElement.click();
    })
  }
  CloseBannerWarnings() {
    this.close_bannerwarnings.nativeElement.click();

  }

  ngOnInit(): void {
    this.GetBannerWarnings(() => {
      this.ApplyOverrideConfigurationToWarnings();
      this.SetBannerWarningStatus();
      this.loadcomplete.emit();
    })
  }

  ApplyOverrideConfigurationToWarnings() {

    let config = this.appService.appConfig.AppSettings.BannerWarningOverrides;
    if (config && Array.isArray(config)) {
      config.forEach(c => {
        let mw = this.mainWarnings.filter(x => x.warninggroup.toLowerCase() == c.warninggroup.toLowerCase());

        mw.forEach(w => {
          w.__canbedismissed = c.canbedismissed;
          w.__canberesolved = c.canberesolved;
          w.__resolvemodule = c.resolvemodule;
          w.__dismissreasonrequired = c.dismissreasonrequired;
        });

      });
    }

  }

  DismissBannerWarning(warning: Bannerwarningoverrides) {
    if (warning.__dismissreasonrequired && FormSettings.IsNullOrEmpty(warning.__dismissmessage)) {
      warning.__dismissmessageerror = true;
    }
    else {
      warning.dismissedon = this.appService.getDateTimeinISOFormat(moment().toDate());
      warning.dismissedby = this.appService.loggedInUserName;
      warning.dismissreason = warning.__dismissmessage;
      warning.encounter_id = this.appService.encounter.encounter_id;
      warning.epma_bannerwarningoverrides_id = uuid();

      let postobject = new Bannerwarningoverrides();
      postobject.epma_bannerwarningoverrides_id = warning.epma_bannerwarningoverrides_id;
      postobject.person_id = warning.person_id;
      postobject.encounter_id = warning.encounter_id;
      postobject.dismissedby = warning.dismissedby;
      postobject.dismissedon = warning.dismissedon;
      postobject.dismissreason = warning.dismissreason;
      postobject.warningdetail = warning.warningdetail;
      postobject.warninggroup = warning.warninggroup;
      postobject.warningheader = warning.warningheader;

      this.subscriptions.add(this.apiRequest.postRequest(this.appService.baseURI +
        "/PostObject?synapsenamespace=local&synapseentityname=epma_bannerwarningoverrides", JSON.stringify(postobject),false)
        .subscribe((response) => {
          warning.__dismissmessageerror = false;
          warning.__isdismissed = true;
          this.SetBannerWarningStatus();
        }));
    }
  }
  ResolveBannerWarning(warning: Bannerwarningoverrides) {
    if (warning.warninggroup.toLowerCase() == "weight") {
      this.subjects.captureWeight.next();
      this.CloseBannerWarnings();
    }
    else {
      //temporary message until module loding is implemented 
      if (FormSettings.IsNullOrEmpty(warning.__resolvemodule)) {
        alert(["Please navigate to", warning.warninggroup, "module to resolve this issue."].join(" "));
      }
      else {
        this.CloseBannerWarnings();
        this.subjects.frameworkEvent.next("LOAD_SECONDARY_MODULE_" + warning.__resolvemodule);
      }
    }
  }

  SetBannerWarningStatus() {
    let tempstatus = this.appService.bannerWarningStatus;
    if (!this.mainWarnings || this.mainWarnings.length == 0)
      this.appService.bannerWarningStatus = true;
    else {
      this.appService.bannerWarningStatus = true;
      this.mainWarnings.forEach(mw => {
        if (mw.__isdismissed != true) {
          this.appService.bannerWarningStatus = false;
        }
      });
    }
    if (this.appService.bannerWarningStatus) {
      this.CloseBannerWarnings();
      if (tempstatus != this.appService.bannerWarningStatus) {
        this.subjects.refreshDrugChart.next();
      }
    }

     //this.appService.bannerWarningStatus = true;

  }

  GetBannerWarnings(cb: Function) {
    this.subscriptions.add(this.apiRequest.getRequest(`${this.appService.baseURI}/GetBaseViewListByAttribute/patientbanner_mainwarnings?synapseattributename=person_id&attributevalue=${this.appService.personId}`).subscribe(
      (response) => {
        if (response) {
          if (!this.mainWarnings)
            this.mainWarnings = JSON.parse(response);
          else {
            let parsed = JSON.parse(response);

            //delete all from main warnings that have been resolved 
            let toremove = [];
            this.mainWarnings.forEach(mw => {
              let rm = parsed.find(x => x.warninggroup == mw.warninggroup && mw.warningdetail == x.warningdetail
                && mw.warningheader == x.warningheader);
              if (!rm)
                toremove.push(mw);
            })
            toremove.forEach(x => {
              const index = this.mainWarnings.indexOf(x);
              if (index > -1) {
                this.mainWarnings.splice(index, 1);
              }
            });

            //add all new warnings into main warnings since last refresh
            parsed.forEach(pw => {
              let nw = this.mainWarnings.find(x => x.warninggroup == pw.warninggroup && pw.warningdetail == x.warningdetail
                && pw.warningheader == x.warningheader);
              if (!nw)
                this.mainWarnings.push(pw);
            });
          }
          console.log("BannerWarnings", this.mainWarnings);
          for (var i = 0; i < this.mainWarnings.length; i++) {
            if (!this.mainWarnings[i].__isdismissed)
              this.mainWarnings[i].__dismissmessage = "";
            if (this.warningGroups.indexOf(this.mainWarnings[i].warninggroup) === -1) {
              console.log('Warning Group: ', this.mainWarnings[i].warninggroup);
              this.warningGroups.push(this.mainWarnings[i].warninggroup);
            }
          }
          cb();
        }
        else {
          cb();
        }
      }));
  }
}


