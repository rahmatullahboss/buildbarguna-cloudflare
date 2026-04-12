# Shariah Governance Operating Model

এই platform-এর code-level governance controls এখন ৩টি core layer enforce করে:

1. Investment gate
project investable হবে না যদি:
- `shariah_screening_status = approved` না হয়
- prohibited activity screening complete না হয়
- asset backing confirm না হয়
- profit ratio, loss clause, principal risk notice disclose না হয়
- use of proceeds, profit/loss policy, principal risk notice text empty থাকে

2. Closeout gate
project `completed` বা `closed` হবে না যদি:
- pending share purchase থাকে
- pending expense allocation থাকে
- undistributed profit থাকে
- ops reconciliation complete না হয়
- loss settlement unresolved থাকে
- capital refund already done থাকে

3. Investor disclosure layer
public project page-এ এখন নিচের disclosure visible থাকবে:
- contract type
- screening status
- use of proceeds
- profit/loss policy
- principal risk notice
- reviewer name

## Shariah Governance মানে কী

শুধু “halal” wording না। এর মানে:
- কোন contract model-এ project চলছে সেটা documented
- haram/prohibited business activity screened
- investor-কে আগেই profit/loss rules clear করা
- principal guaranteed না হলে সেটা স্পষ্ট বলা
- closeout-এর আগে accounts reconcile করা
- loss case হলে documented settlement review ছাড়া terminal action না দেওয়া

## Manual controls still required

Code সব religious/legal judgment replace করতে পারবে না। launch-এর আগে manualভাবে লাগবে:
- qualified Shariah advisor/board sign-off
- legal terms review
- monthly reconciliation review
- incident response runbook for payout mismatch
- maker-checker approval for large settlement operations

## Recommended production SOP

1. Admin project create করবে as `draft`
2. Compliance page complete না হওয়া পর্যন্ত `active` করা যাবে না
3. Only approved compliance projects accept new investments
4. Monthly finance reconcile করতে হবে
5. Profit distribution-এর আগে preview confirm করতে হবে
6. Project terminal stage-এ closeout page সব blocker দেখাবে
7. Loss থাকলে automated closeout নয়, manual review escalation
