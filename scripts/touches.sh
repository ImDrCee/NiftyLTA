#!/bin/bash
# usage: touches.sh <monthly.csv> -> touch events with fwd 3/6/12m returns from that month's close, plus current position
awk -F, -v sym="$2" 'NR>1{n++;M[n]=$1;O[n]=$2;H[n]=$3;L[n]=$4;C[n]=$5;U[n]=$7;D[n]=$8;S9[n]=$9;P[n]=$10}
END{
  for(i=1;i<=n;i++){ if(U[i]=="")continue
    t=""; if(H[i]>=U[i])t="TOP"; if(L[i]<=D[i])t=(t==""?"BOTTOM":"BOTH")
    if(t!=""){ cb=(C[i]>=U[i]?"closed>=upper":(C[i]<=D[i]?"closed<=lower":"closed-inside"))
      f3=(i+3<=n&&P[i+3]!=1)?sprintf("%.1f",(C[i+3]/C[i]-1)*100):"-"
      f6=(i+6<=n&&P[i+6]!=1)?sprintf("%.1f",(C[i+6]/C[i]-1)*100):"-"
      f12=(i+12<=n&&P[i+12]!=1)?sprintf("%.1f",(C[i+12]/C[i]-1)*100):"-"
      printf "%s,%s,%s,%s,close=%s,upper=%s,lower=%s,f3=%s,f6=%s,f12=%s\n",sym,M[i],t,cb,C[i],U[i],D[i],f3,f6,f12 } }
  i=n; printf "NOW,%s,%s,cmp=%s,upper=%s,lower=%s,toUpper%%=%.1f,aboveLower%%=%.1f,sma9=%s,cmp_vs_sma9%%=%.1f,bandwidth%%=%.1f\n",sym,M[i],C[i],U[i],D[i],(U[i]/C[i]-1)*100,(C[i]/D[i]-1)*100,S9[i],(C[i]/S9[i]-1)*100,(U[i]-D[i])/((U[i]+D[i])/2)*100
}' "$1"
